/**
 * Transfer Reconciliation Service for Finova
 *
 * Atomically detects, validates, and reconciles IPN self-transfers
 * represented by separate outgoing and incoming SMS messages.
 * Complies with Constitution Principles I, II, III, IV, and V.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { applyTransactionDelta } = require('./analyticsEngine');
const { withRetry, updateBudgetIncrementally } = require('./transactionService');

const SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45;

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
 * Attempts to reconcile a newly arrived SMS transaction with an existing counterpart
 * within the 45-second window into a single IPN self-transfer transaction.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId - Authenticated user ID
 * @param {Object} params.currentTransaction - The saved Mongoose transaction document
 * @param {Object} params.parsedSms - Normalized parsed SMS metadata
 * @param {string} params.smsHash - SHA-256 hash of current raw SMS
 * @returns {Promise<{ isReconciled: boolean, transaction: Object, counterpartId?: mongoose.Types.ObjectId }>}
 */
const attemptTransferReconciliation = async ({ userId, currentTransaction, parsedSms, smsHash }) => {
  if (!userId || !currentTransaction || !parsedSms || !smsHash) {
    return { isReconciled: false, transaction: currentTransaction };
  }

  // Only expense and income transactions from sms_shortcut can be paired
  if (!['expense', 'income'].includes(currentTransaction.type) || currentTransaction.source !== 'sms_shortcut') {
    return { isReconciled: false, transaction: currentTransaction };
  }

  const txCreatedAt = currentTransaction.createdAt ? new Date(currentTransaction.createdAt) : new Date();
  const windowStart = new Date(txCreatedAt.getTime() - SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(txCreatedAt.getTime() + SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000);

  // Candidate must have opposite type (expense <-> income) and exact same amount
  const oppositeType = currentTransaction.type === 'expense' ? 'income' : 'expense';

  // Strictly query within the same authenticated user scope (multi-tenant isolation)
  const candidates = await Transaction.find({
    user: userId,
    source: 'sms_shortcut',
    type: oppositeType,
    amount: currentTransaction.amount,
    _id: { $ne: currentTransaction._id },
    createdAt: { $gte: windowStart, $lte: windowEnd }
  }).sort({ createdAt: -1 });

  if (!candidates || candidates.length === 0) {
    return { isReconciled: false, transaction: currentTransaction };
  }

  // Iterate over candidates and evaluate the 10 strict pairing criteria
  for (const candidate of candidates) {
    // Rule 1: Multi-tenant ownership
    if (String(candidate.user) !== String(userId) || String(currentTransaction.user) !== String(userId)) {
      continue;
    }

    // Rule 2: Opposite directions
    const currentIsOutgoing = currentTransaction.smsDirection === 'outgoing' || currentTransaction.type === 'expense';
    const candidateIsOutgoing = candidate.smsDirection === 'outgoing' || candidate.type === 'expense';
    if (currentIsOutgoing === candidateIsOutgoing) {
      continue;
    }

    // Rule 3: Exact amount equality
    if (Math.abs(Number(currentTransaction.amount) - Number(candidate.amount)) > 0.001) {
      continue;
    }

    // Determine outgoing vs incoming
    const outgoingTx = currentIsOutgoing ? currentTransaction : candidate;
    const incomingTx = currentIsOutgoing ? candidate : currentTransaction;

    const fromAccountId = outgoingTx.account;
    const toAccountId = incomingTx.account;

    // Rule 4: Both source and destination accounts must be explicitly resolved (neither is null)
    if (!fromAccountId || !toAccountId) {
      continue;
    }

    // Rule 5: Source and destination accounts must be distinct
    if (String(fromAccountId) === String(toAccountId)) {
      continue;
    }

    // Rule 6: Both accounts owned by the authenticated user and active
    const userAccounts = await Account.find({
      _id: { $in: [fromAccountId, toAccountId] },
      user: userId,
      isArchived: { $ne: true }
    }).lean();

    if (userAccounts.length !== 2) {
      continue;
    }

    // Rule 7: Pairing window check
    const candidateCreatedAt = candidate.createdAt ? new Date(candidate.createdAt) : new Date();
    const timeDiffMs = Math.abs(txCreatedAt.getTime() - candidateCreatedAt.getTime());
    if (timeDiffMs > SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000) {
      continue;
    }

    // Rules 8, 9, 10: Reference number check
    const refCurrent = (currentTransaction.referenceNumber || '').trim().toLowerCase();
    const refCandidate = (candidate.referenceNumber || '').trim().toLowerCase();

    if (refCurrent && refCandidate) {
      // Both messages have reference numbers: must match exactly
      if (refCurrent !== refCandidate) {
        // Rule 10: Mismatched references strictly rejected
        continue;
      }
      // Rule 8: Matched reference
    }
    // Rule 9 / FR-009: If one or both lack reference number, pairing is permitted as rules 1-7 strongly pass.

    const candidateHash = candidate.smsHash;
    if (!candidateHash) {
      continue;
    }

    // Compute pair idempotency key
    const pairKey = computePairIdempotencyKey(smsHash, candidateHash);

    // Concurrency guard: Check if already reconciled into a transfer with this pairKey
    const existingTransfer = await Transaction.findOne({
      user: userId,
      idempotencyKey: pairKey
    });

    if (existingTransfer) {
      return { isReconciled: true, transaction: existingTransfer, counterpartId: candidate._id };
    }

    // Formulate provenance metadata for both messages
    const currentMeta = {
      smsHash: smsHash,
      direction: currentIsOutgoing ? 'outgoing' : 'incoming',
      accountLast4: parsedSms.accountLast4 || parsedSms.cardLast4 || null,
      account: currentTransaction.account || null,
      referenceNumber: currentTransaction.referenceNumber || null,
      eventTimestamp: currentTransaction.date || null,
      receivedAt: currentTransaction.createdAt || new Date()
    };

    const candidateAccount = userAccounts.find(a => String(a._id) === String(candidate.account));
    const candidateMeta = {
      smsHash: candidateHash,
      direction: candidateIsOutgoing ? 'outgoing' : 'incoming',
      accountLast4: candidateAccount ? candidateAccount.cardLast4 : null,
      account: candidate.account || null,
      referenceNumber: candidate.referenceNumber || null,
      eventTimestamp: candidate.date || null,
      receivedAt: candidate.createdAt || new Date()
    };

    const reconciledProvenance = currentIsOutgoing ? [currentMeta, candidateMeta] : [candidateMeta, currentMeta];
    const reconciledReference = refCurrent || refCandidate || null;

    let reconciledTransaction = null;

    // Execute atomic reconciliation transaction with retries
    await withRetry(async () => {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Verify candidate still exists and has not been reconciled concurrently
          const freshCandidate = await Transaction.findOne({
            _id: candidate._id,
            user: userId,
            type: oppositeType
          }).session(session);

          if (!freshCandidate) {
            // Already modified or deleted concurrently
            return;
          }

          // 1. Update current transaction to type: 'transfer'
          reconciledTransaction = await Transaction.findOneAndUpdate(
            { _id: currentTransaction._id, user: userId },
            {
              $set: {
                type: 'transfer',
                title: 'تحويل ذاتي (IPN)',
                from_account: fromAccountId,
                to_account: toAccountId,
                account: null,
                category: null,
                amount: currentTransaction.amount,
                referenceNumber: reconciledReference,
                idempotencyKey: pairKey,
                smsProvenance: reconciledProvenance,
                smsDirection: null
              }
            },
            { returnDocument: 'after', session }
          );

          // 2. Delete the superseded candidate transaction
          await Transaction.deleteOne({ _id: candidate._id, user: userId }).session(session);

          // 3. Roll back temporary budget spent if candidate was an expense
          if (candidate.type === 'expense') {
            await updateBudgetIncrementally(userId, candidate, -1, session);
          }
        });
      } catch (err) {
        // Handle race conditions where another worker inserted the transfer with pairKey
        if (err.code === 11000 || /duplicate key/i.test(err.message)) {
          const concurrentTransfer = await Transaction.findOne({ user: userId, idempotencyKey: pairKey });
          if (concurrentTransfer) {
            reconciledTransaction = concurrentTransfer;
            return;
          }
        }
        // Fallback for standalone MongoDB environments without replica set support
        if (err.message && err.message.includes('Transaction numbers are only allowed on a replica set member')) {
          const freshCandidate = await Transaction.findOne({
            _id: candidate._id,
            user: userId,
            type: oppositeType
          });
          if (!freshCandidate) return;

          reconciledTransaction = await Transaction.findOneAndUpdate(
            { _id: currentTransaction._id, user: userId },
            {
              $set: {
                type: 'transfer',
                title: 'تحويل ذاتي (IPN)',
                from_account: fromAccountId,
                to_account: toAccountId,
                account: null,
                category: null,
                amount: currentTransaction.amount,
                referenceNumber: reconciledReference,
                idempotencyKey: pairKey,
                smsProvenance: reconciledProvenance,
                smsDirection: null
              }
            },
            { returnDocument: 'after' }
          );

          await Transaction.deleteOne({ _id: candidate._id, user: userId });
          if (candidate.type === 'expense') {
            await updateBudgetIncrementally(userId, candidate, -1, null);
          }
          return;
        }
        throw err;
      } finally {
        await session.endSession();
      }
    });

    if (reconciledTransaction) {
      // 4. Roll back candidate analytics delta (-1) and apply transfer delta (+1)
      try {
        await applyTransactionDelta(userId, candidate, -1);
        await applyTransactionDelta(userId, reconciledTransaction, 1);
      } catch (analyticsErr) {
        console.error('[ANALYTICS] Transfer reconciliation delta adjustment failed:', analyticsErr.message);
      }

      console.log(`[TRANSFER RECONCILIATION] Success: paired SMS ${smsHash.slice(0, 8)} with ${candidateHash.slice(0, 8)} as transfer ${reconciledTransaction._id}`);

      return {
        isReconciled: true,
        transaction: reconciledTransaction,
        counterpartId: candidate._id
      };
    }
  }

  // If no candidate met all 10 criteria, keep as independent transaction
  return { isReconciled: false, transaction: currentTransaction };
};

module.exports = {
  SMS_TRANSFER_PAIRING_WINDOW_SECONDS,
  computePairIdempotencyKey,
  attemptTransferReconciliation
};
