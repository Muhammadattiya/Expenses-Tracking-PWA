const UserMerchantKnowledge = require('../models/UserMerchantKnowledge');
const GlobalMerchantKnowledge = require('../models/GlobalMerchantKnowledge');
const Category = require('../models/Category');
const { normalizeMerchantToken } = require('./merchantIntelligence/merchantNormalizer');
const { reclassifyTransactionsForMerchant } = require('./merchantIntelligence/autoReclassificationService');

/**
 * Learns a merchant's intent based on a user's category selection.
 * Called automatically when a user categorizes an UNKNOWN merchant.
 * 
 * @param {string} userId The ID of the user
 * @param {string} rawMerchant The raw merchant string from the transaction/SMS
 * @param {string} categoryId The category ID selected by the user
 */
async function learnFromUser(userId, rawMerchant, categoryId) {
  if (!userId || !rawMerchant || !categoryId) return;

  try {
    // 1. Retrieve the selected category and its intentId
    const category = await Category.findOne({ _id: categoryId, user: userId });
    if (!category) {
      return;
    }
    const intentId = category.intentId || 'other';
    const normalized = normalizeMerchantToken(rawMerchant);

    // 2. Update User Merchant Knowledge (Upsert)
    // The user's specific override is always saved with both category and intentId.
    await UserMerchantKnowledge.findOneAndUpdate(
      { user: userId, normalizedMerchant: normalized },
      { intentId: intentId, category: category._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Update Global Merchant Knowledge
    // We only create it if it doesn't exist and category has a universal intentId.
    if (category.intentId) {
      const globalEntry = await GlobalMerchantKnowledge.findOne({ normalizedMerchant: normalized });

      if (!globalEntry) {
        await GlobalMerchantKnowledge.create({
          normalizedMerchant: normalized,
          intentId: category.intentId
        });
      } else if (globalEntry.intentId !== category.intentId) {
         // Log the conflict, but do not overwrite the first learned global intent.
         console.log(`[Merchant Learning] Conflict ignored for ${normalized}: existing=${globalEntry.intentId}, new=${category.intentId}`);
      }
    }

    // 4. Trigger auto-reclassification for other uncategorized transactions matching this merchant
    reclassifyTransactionsForMerchant(userId, rawMerchant, intentId).catch(err => {
      console.error('[ERROR] Auto-reclassification failed in background:', err.message);
    });
  } catch (error) {
    console.error('[ERROR] Failed to learn merchant from user:', error.message);
  }
}

module.exports = {
  learnFromUser
};
