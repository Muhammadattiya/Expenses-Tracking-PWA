const { INTENTS, INTENT_SYNONYMS } = require('./quickAdd/intentTaxonomy');
const { normalizeArabic, transliterateFranco } = require('./quickAdd/nlpParser');

/**
 * Deterministically classifies a given category name into a universal intentId.
 * No LLM, no guessing. Uses exact matching on normalized keywords and synonyms.
 * 
 * @param {string} categoryName The raw category name entered by the user
 * @returns {string|null} The resolved intentId, or null if ambiguous/unknown
 */
function classifyCategoryIntent(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') return null;

  const raw = categoryName.toLowerCase().trim();
  const normalized = normalizeArabic(raw);
  const franco = transliterateFranco(raw);

  // 1. Direct Keyword Match against INTENTS (Highest Confidence)
  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      const normKeyword = normalizeArabic(keyword);
      // Exact match or strict boundary match
      if (normalized === normKeyword || franco === normKeyword) {
        return intent.id;
      }
    }
  }

  // 2. Exact Match against INTENT_SYNONYMS (Medium Confidence)
  for (const [intentId, synonyms] of Object.entries(INTENT_SYNONYMS)) {
    for (const syn of synonyms) {
      const normSyn = normalizeArabic(syn);
      if (normalized === normSyn || franco === normSyn) {
        return intentId;
      }
    }
  }

  // 3. Strict substring matching against INTENTS (Fallback)
  const tokens = normalized.split(/\s+/);
  const francoTokens = franco.split(/\s+/);
  
  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      const normKeyword = normalizeArabic(keyword);
      if (!normKeyword.includes(' ')) {
        if (tokens.includes(normKeyword) || francoTokens.includes(normKeyword)) {
          return intent.id;
        }
      } else {
        if (normalized.includes(normKeyword) || franco.includes(normKeyword)) {
          return intent.id;
        }
      }
    }
  }

  return null;
}

module.exports = {
  classifyCategoryIntent
};
