/**
 * Transfer Reconciliation Service for Finova (Non-Destructive Holding Queue)
 *
 * Atomically detects, validates, and reconciles IPN self-transfers
 * represented by separate outgoing and incoming SMS messages.
 *
 * STRICT MANDATE: ZERO DATABASE DELETIONS.
 * - Transfer candidates are held in a 45-second holding queue.
 * - If a matching counterpart arrives, exactly ONE Transfer transaction is created.
 *   Zero expenses, zero incomes, and ZERO database deletions.
 * - If 45 seconds elapse without a counterpart, the candidate is finalized as an
 *   independent single transaction without any deletion.
 */

const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { applyTransactionDelta } = require('./analyticsEngine');
const notificationService = require('./notificationService');

const SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45;

/**
 * In-memory holding queue for pending transfer candidates.
 * Partitioned strictly by authenticated user ID for 100% tenant isolation.
 * Map<userId_string, Array<HeldCandidate>>
 */
const transferHoldingQueue = new Map();

/**
 * Computes a deterministic idempotency key for an SMS pair
 * by sorting the two hashes lexicographically.
 * @param {string} hash1
 * @param {string} hash2
 * @returns {string} SHA-256 hex digest
 */
const computePairIdempotencyKey = (hash1, hash2) => {
  const sorted = [String(hash1), String(hash2)].sort().join(':');
  return crypto.createHash('sha256').update(sorted).digest('hex');
};

/**
 * Processes an incoming transfer candidate using the non-destructive holding queue.
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated User document
 * @param {Object} params.parsedData - Parsed SMS object
 * @param {mongoose.Types.ObjectId|string|null} params.accountId - Resolved Account ID
 * @param {mongoose.Types.ObjectId|string|null} params.categoryId - Resolved Category ID
 * @param {string} params.smsText - Raw or sanitized SMS text
 * @param {string} params.smsHash - SHA-256 hash of raw SMS
 * @param {Function} params.finalizeCallback - Callback invoked if candidate times out and becomes a single transaction
 * @returns {Promise<{ isReconciled: boolean, isPending: boolean, transaction?: Object }>}
 */
const processTransferCandidate = async ({
  user,
  parsedData,
  accountId,
  categoryId,
  smsText,
  smsHash,
  finalizeCallback
}) => {
  const userIdStr = String(user._id);

  if (!transferHoldingQueue.has(userIdStr)) {
    transferHoldingQueue.set(userIdStr, []);
  }

  const userQueue = transferHoldingQueue.get(userIdStr);

  // In-memory deduplication check: if this exact SMS is already in queue, return pending
  const existingCandidate = userQueue.find(c => c.smsHash === smsHash);
  if (existingCandidate) {
    return { isReconciled: false, isPending: true };
  }

  const currentIsOutgoing = parsedData.direction === 'outgoing' || parsedData.type === 'expense';
  const now = Date.now();

  // Search queue for an eligible matching counterpart
  let matchedIndex = -1;

  for (let i = 0; i < userQueue.length; i++) {
    const candidate = userQueue[i];

    // Rule 1: Multi-tenant ownership (already strictly partitioned by userIdStr)
    if (candidate.userId !== userIdStr) {
      continue;
    }

    // Rule 2: Opposite directions (one outgoing, one incoming)
    const candidateIsOutgoing = candidate.parsedData.direction === 'outgoing' || candidate.parsedData.type === 'expense';
    if (currentIsOutgoing === candidateIsOutgoing) {
      continue;
    }

    // Rule 3: Exact amount equality
    if (Math.abs(Number(candidate.parsedData.amount) - Number(parsedData.amount)) > 0.001) {
      continue;
    }

    // Rule 4: Both source and destination accounts must be explicitly resolved
    if (!candidate.accountId || !accountId) {
      continue;
    }

    // Rule 5: Source and destination accounts must be distinct
    if (String(candidate.accountId) === String(accountId)) {
      continue;
    }

    // Rule 6: Both accounts verified active and owned by this user
    const userAccounts = await Account.find({
      _id: { $in: [candidate.accountId, accountId] },
      user: user._id,
      isArchived: { $ne: true }
    }).lean();

    if (userAccounts.length !== 2) {
      continue;
    }

    // Rule 7: Within the pairing window
    const timeDiffMs = Math.abs(now - candidate.receivedAt.getTime());
    if (timeDiffMs > SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000) {
      continue;
    }

    // Rules 8, 9, 10: Reference number validation
    const refCurrent = (parsedData.referenceNumber || '').trim().toLowerCase();
    const refCandidate = (candidate.parsedData.referenceNumber || '').trim().toLowerCase();

    if (refCurrent && refCandidate) {
      if (refCurrent !== refCandidate) {
        // Mismatched references strictly rejected
        continue;
      }
    }

    // Candidate passed all criteria
    matchedIndex = i;
    break;
  }

  // ==========================================
  // CASE A: Eligible Counterpart Found!
  // ==========================================
  if (matchedIndex !== -1) {
    const [counterpart] = userQueue.splice(matchedIndex, 1);
    if (counterpart.timer) {
      clearTimeout(counterpart.timer);
    }

    const outgoing = currentIsOutgoing
      ? { parsedData, accountId, smsHash, smsText, receivedAt: new Date() }
      : counterpart;
    const incoming = currentIsOutgoing
      ? counterpart
      : { parsedData, accountId, smsHash, smsText, receivedAt: new Date() };

    const pairKey = computePairIdempotencyKey(outgoing.smsHash, incoming.smsHash);

    // Concurrency check: does a Transfer with this pairKey already exist?
    let transferTx = await Transaction.findOne({
      user: user._id,
      idempotencyKey: pairKey
    });

    if (!transferTx) {
      const reconciledReference = outgoing.parsedData.referenceNumber || incoming.parsedData.referenceNumber || null;
      const reconciledDate = outgoing.parsedData.eventTimestamp || incoming.parsedData.eventTimestamp || new Date();

      const reconciledProvenance = [
        {
          smsHash: outgoing.smsHash,
          direction: 'outgoing',
          accountLast4: outgoing.parsedData.accountLast4 || outgoing.parsedData.cardLast4 || null,
          account: outgoing.accountId,
          referenceNumber: outgoing.parsedData.referenceNumber || null,
          eventTimestamp: outgoing.parsedData.eventTimestamp || null,
          receivedAt: outgoing.receivedAt || new Date()
        },
        {
          smsHash: incoming.smsHash,
          direction: 'incoming',
          accountLast4: incoming.parsedData.accountLast4 || incoming.parsedData.cardLast4 || null,
          account: incoming.accountId,
          referenceNumber: incoming.parsedData.referenceNumber || null,
          eventTimestamp: incoming.parsedData.eventTimestamp || null,
          receivedAt: incoming.receivedAt || new Date()
        }
      ];

      // CREATE EXACTLY ONE TRANSFER TRANSACTION. ZERO DB DELETIONS!
      transferTx = await Transaction.create({
        user: user._id,
        title: 'تحويل ذاتي (IPN)',
        amount: outgoing.parsedData.amount,
        type: 'transfer',
        from_account: outgoing.accountId,
        to_account: incoming.accountId,
        source: 'sms_shortcut',
        referenceNumber: reconciledReference,
        date: reconciledDate,
        smsHash: pairKey,
        idempotencyKey: pairKey,
        smsProvenance: reconciledProvenance
      });

      // Apply transfer analytics delta (+1 transfer)
      try {
        await applyTransactionDelta(user._id, transferTx, 1);
      } catch (deltaErr) {
        console.error('[ANALYTICS] Transfer delta error:', deltaErr.message);
      }

      // Send single push notification for the reconciled transfer
      try {
        const payload = notificationService.buildPayload({
          title: 'تحويل ذاتي (IPN)',
          body: `تم رصد تحويل ذاتي بمبلغ ${transferTx.amount} ج.م بين حساباتك`,
          url: '/'
        });
        await notificationService.sendToUser(user._id, payload);
      } catch (pushErr) {
        console.error('[PUSH] Transfer push notification error:', pushErr.message);
      }

      console.log(`[SMS Webhook] reconciled_transfer id="${transferTx._id}" amount=${transferTx.amount}`);
    }

    return {
      isReconciled: true,
      isPending: false,
      transaction: transferTx
    };
  }

  // ==========================================
  // CASE B: Counterpart Not Found -> Hold in Queue
  // ==========================================
  const candidateRecord = {
    id: crypto.randomBytes(8).toString('hex'),
    userId: userIdStr,
    user: user,
    parsedData: parsedData,
    accountId: accountId,
    categoryId: categoryId,
    smsText: smsText,
    smsHash: smsHash,
    receivedAt: new Date(),
    timer: null
  };

  // Set timer to finalize as single transaction if 45s passes without counterpart
  candidateRecord.timer = setTimeout(async () => {
    try {
      // Remove from queue
      const q = transferHoldingQueue.get(userIdStr);
      if (q) {
        const idx = q.findIndex(c => c.id === candidateRecord.id);
        if (idx !== -1) {
          q.splice(idx, 1);
        }
      }

      // Finalize candidate as independent single transaction via callback
      if (typeof finalizeCallback === 'function') {
        await finalizeCallback(candidateRecord);
      }
    } catch (timeoutErr) {
      console.error('[TRANSFER HOLDING] Finalize on timeout error:', timeoutErr.message);
    }
  }, SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000);

  userQueue.push(candidateRecord);

  console.log(`[SMS Webhook] transfer_candidate_held id="${candidateRecord.id}" amount=${parsedData.amount} direction=${parsedData.direction}`);

  return {
    isReconciled: false,
    isPending: true
  };
};

/**
 * Flush all pending items in the queue immediately as single transactions.
 * Useful for graceful process shutdown without data loss.
 */
const flushPendingHoldingQueue = async (finalizeCallback) => {
  for (const [userIdStr, queue] of transferHoldingQueue.entries()) {
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate.timer) {
        clearTimeout(candidate.timer);
      }
      if (typeof finalizeCallback === 'function') {
        try {
          await finalizeCallback(candidate);
        } catch (err) {
          console.error(`[TRANSFER HOLDING] Flush error for candidate ${candidate.id}:`, err.message);
        }
      }
    }
  }
};

/**
 * Helper to inspect or clear queue in unit tests (in-memory only, ZERO DB TOUCHED).
 */
const _getQueueForUser = (userId) => {
  return transferHoldingQueue.get(String(userId)) || [];
};

const _clearQueueForUser = (userId) => {
  const q = transferHoldingQueue.get(String(userId)) || [];
  q.forEach(c => { if (c.timer) clearTimeout(c.timer); });
  transferHoldingQueue.delete(String(userId));
};

module.exports = {
  SMS_TRANSFER_PAIRING_WINDOW_SECONDS,
  computePairIdempotencyKey,
  processTransferCandidate,
  flushPendingHoldingQueue,
  _getQueueForUser,
  _clearQueueForUser
};
