const fs = require('fs');
const path = require('path');
const { normalizeMerchantToken } = require('./merchantNormalizer');
const { extractIntent } = require('../quickAdd/nlpParser');

let globalDictionary = {};

// Load JSON once on service initialization
try {
  const dictionaryPath = path.join(__dirname, '../../data/globalMerchants.json');
  const fileContent = fs.readFileSync(dictionaryPath, 'utf8');
  globalDictionary = JSON.parse(fileContent);
} catch (error) {
  console.warn('[Merchant Intelligence] Failed to load globalMerchants.json', error.message);
}

/**
 * Main classification function for a raw merchant string.
 * Pipeline: Normalization -> Exact Global Match -> Semantic Fallback
 * @param {string} rawMerchant The raw merchant string (e.g. "PAYMOB*LIMBO CAFE")
 * @returns {object} The classification result
 */
function classifyMerchant(rawMerchant) {
  const normalizedMerchant = normalizeMerchantToken(rawMerchant);

  // Safety exceptions for generic English words that prefix-match incorrectly
  const exactExceptions = ['UNKNOWN MERCHANT', 'MARKETPLACE', 'MARKETING', 'RENTAL', 'BUSINESS', 'CURRENT', 'CAREFUL'];
  if (!normalizedMerchant || exactExceptions.includes(normalizedMerchant)) {
    return {
      merchant: rawMerchant,
      normalizedMerchant,
      intentId: null,
      source: 'UNKNOWN',
      matchedKey: null
    };
  }

  // 2. Global Exact Merchant Matching (O(1) dictionary lookup)
  const globalIntent = globalDictionary[normalizedMerchant];
  if (globalIntent) {
    return {
      merchant: rawMerchant,
      normalizedMerchant,
      intentId: globalIntent,
      source: 'GLOBAL_MERCHANT',
      matchedKey: normalizedMerchant
    };
  }

  // 3. Semantic Fallback (via existing Intent NLP with prefix matching enabled)
  const fallbackIntent = extractIntent(normalizedMerchant, { fallbackPrefix: true });
  if (fallbackIntent) {
    return {
      merchant: rawMerchant,
      normalizedMerchant,
      intentId: fallbackIntent,
      source: 'SEMANTIC_KEYWORD',
      matchedKey: null
    };
  }

  // 4. Unknown
  return {
    merchant: rawMerchant,
    normalizedMerchant,
    intentId: null,
    source: 'UNKNOWN',
    matchedKey: null
  };
}

module.exports = { classifyMerchant, normalizeMerchantToken };
