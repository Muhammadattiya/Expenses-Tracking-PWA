const UserMerchantKnowledge = require('../../models/UserMerchantKnowledge');
const GlobalMerchantKnowledge = require('../../models/GlobalMerchantKnowledge');
const { classifyMerchant: classifyGlobalStatic } = require('./globalMerchantDictionary');
const { extractIntent } = require('../quickAdd/nlpParser');
const { normalizeMerchantToken } = require('./merchantNormalizer');

/**
 * Deterministically resolves the intentId of a raw merchant string.
 * Enforces the strict precedence:
 * 1. User Knowledge
 * 2. Global Static Dictionary
 * 3. Global Learned Knowledge (Verified)
 * 4. Semantic Fallback
 * 5. UNKNOWN
 * 
 * @param {string} rawMerchant The raw merchant string from SMS
 * @param {string} userId The user's ID
 * @returns {Promise<string|null>} The resolved intentId, or null if UNKNOWN
 */
async function resolveMerchantIntent(rawMerchant, userId) {
  if (!rawMerchant) return null;

  const normalized = normalizeMerchantToken(rawMerchant);

  // 1. User Knowledge (Highest precedence)
  if (userId) {
    const userKnowledge = await UserMerchantKnowledge.findOne({
      user: userId,
      normalizedMerchant: normalized
    }).lean();

    if (userKnowledge && userKnowledge.intentId) {
      return userKnowledge.intentId;
    }
  }

  // 2. Global Static Dictionary
  // classifyGlobalStatic expects raw, but it internaly normalizes it
  // Wait, let's pass the raw to it as it was designed to handle it.
  const staticIntent = classifyGlobalStatic(rawMerchant);
  if (staticIntent && staticIntent.intentId) {
    return staticIntent.intentId;
  }

  // 3. Global Learned Knowledge
  const globalKnowledge = await GlobalMerchantKnowledge.findOne({
    normalizedMerchant: normalized
  }).lean();

  if (globalKnowledge && globalKnowledge.intentId) {
    return globalKnowledge.intentId;
  }

  // 4. Semantic Fallback (Controlled Prefix / Semantic Parsing)
  // extractIntent handles standard prefix matches and explicit keywords
  const semanticIntent = extractIntent(rawMerchant);
  if (semanticIntent) {
    return semanticIntent;
  }

  // 5. UNKNOWN
  return null;
}

module.exports = {
  resolveMerchantIntent
};
