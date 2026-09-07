const Category = require('../../models/Category');
const { INTENTS, INTENT_SYNONYMS } = require('./intentTaxonomy');
const { normalizeArabic, transliterateFranco } = require('./nlpParser');

async function resolveCategory(userId, intentId, type) {
  // We prioritize categories that match the expected transaction type (income vs expense)
  const categories = await Category.find({ user: userId, type }).sort({ createdAt: 1 }).lean();
  if (!categories || categories.length === 0) return null;
  
  // 1. Exact Match via Migrated intent metadata (Highest Confidence)
  if (intentId) {
    let bestMatch = categories.find(c => c.intentId === intentId);
    if (bestMatch) return bestMatch;
  }
  
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
