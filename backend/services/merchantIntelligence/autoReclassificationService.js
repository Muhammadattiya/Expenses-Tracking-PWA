const Transaction = require('../../models/Transaction');
const Category = require('../../models/Category');
const { normalizeMerchantToken } = require('./merchantNormalizer');
const { resolveCategory } = require('../quickAdd/intentResolver');

/**
 * Attempts to automatically reclassify eligible uncategorized transactions
 * for a specific user and merchant, after the system learns a new merchant intent.
 *
 * @param {string} userId The ID of the user
 * @param {string} rawMerchant The raw merchant string to reclassify
 * @param {string} intentId The learned intent
 */
async function reclassifyTransactionsForMerchant(userId, rawMerchant, intentId) {
  if (!userId || !rawMerchant || !intentId) return;

  try {
    const normalizedMerchant = normalizeMerchantToken(rawMerchant);
    
    // 1. Find all eligible uncategorized transactions for this merchant.
    // Eligible means: category is null, source is SMS, and matches the normalized merchant.
    const eligibleTransactions = await Transaction.find({
      user: userId,
      normalizedMerchant: normalizedMerchant,
      category: null,
      source: { $in: ['sms_shortcut', 'apple_shortcut'] }
    });

    if (!eligibleTransactions || eligibleTransactions.length === 0) {
      return;
    }

    // 2. Iterate and resolve category. We process sequentially to use intentResolver.
    let reclassifiedCount = 0;
    
    for (const tx of eligibleTransactions) {
      // Find the best deterministic category for this intent and transaction type
      const resolvedCategory = await resolveCategory(userId, intentId, tx.type);
      
      if (resolvedCategory) {
        // Safe update: only update the category, nothing else.
        await Transaction.updateOne(
          { _id: tx._id, user: userId, category: null },
          { $set: { category: resolvedCategory._id } }
        );
        reclassifiedCount++;
      }
    }
    
    if (reclassifiedCount > 0) {
      console.log(`[Auto-Reclassification] Reclassified ${reclassifiedCount} uncategorized transactions for merchant "${normalizedMerchant}".`);
    }
  } catch (error) {
    console.error('[ERROR] Failed auto-reclassification:', error.message);
  }
}

module.exports = {
  reclassifyTransactionsForMerchant
};
