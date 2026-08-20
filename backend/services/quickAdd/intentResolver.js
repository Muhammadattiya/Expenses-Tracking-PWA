const Category = require('../../models/Category');
const { INTENTS, INTENT_SYNONYMS } = require('./intentTaxonomy');
const { normalizeArabic, transliterateFranco } = require('./nlpParser');

async function resolveCategory(userId, intentId, type) {
  // We prioritize categories that match the expected transaction type (income vs expense)
  const categories = await Category.find({ user: userId, type }).lean();
  if (!categories || categories.length === 0) return null;
  
  // 1. Exact Match via Migrated intent metadata (Highest Confidence)
  let bestMatch = categories.find(c => c.intent === intentId && c.intentConfidence >= 0.8);
  if (bestMatch) return bestMatch;
  
  // 2. Secondary Match via intent metadata (Medium Confidence)
  bestMatch = categories.find(c => c.intent === intentId && c.intentConfidence >= 0.5);
  if (bestMatch) return bestMatch;
  
  // 3. Fallback: Heuristic Name Matching (Legacy / Unmigrated)
  // Get synonyms for this intent
  const synonyms = INTENT_SYNONYMS[intentId] || [];
  let nameMatch = null;
  
  for (const cat of categories) {
    const normName = normalizeArabic(cat.name);
    const francoName = transliterateFranco(cat.name);
    
    // Check if any synonym is heavily present in the category name
    for (const syn of synonyms) {
      const normSyn = normalizeArabic(syn);
      if (normName.includes(normSyn) || francoName.includes(normSyn)) {
        nameMatch = cat;
        break;
      }
    }
    if (nameMatch) break;
  }
  
  return nameMatch;
}

module.exports = { resolveCategory };
