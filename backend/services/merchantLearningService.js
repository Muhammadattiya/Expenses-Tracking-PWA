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
    if (!category || !category.intentId) {
      // If the category has no universal intent, we cannot learn globally
      return;
    }
    const intentId = category.intentId;
    const normalized = normalizeMerchantToken(rawMerchant);

    // 2. Update User Merchant Knowledge (Upsert)
    // The user's specific override is always saved.
    await UserMerchantKnowledge.findOneAndUpdate(
      { user: userId, normalizedMerchant: normalized },
      { intentId: intentId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Update Global Merchant Knowledge
    // We only create it if it doesn't exist. First confirmation wins.
    // If it exists with a different intent, we do NOT blindly overwrite it.
    // We preserve the existing learned mapping.
    const globalEntry = await GlobalMerchantKnowledge.findOne({ normalizedMerchant: normalized });

    if (!globalEntry) {
      await GlobalMerchantKnowledge.create({
        normalizedMerchant: normalized,
        intentId: intentId
      });
    } else if (globalEntry.intentId !== intentId) {
       // Log the conflict, but do not overwrite the first learned global intent.
       // The user still gets their user-specific override from step 2.
       console.log(`[Merchant Learning] Conflict ignored for ${normalized}: existing=${globalEntry.intentId}, new=${intentId}`);
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
