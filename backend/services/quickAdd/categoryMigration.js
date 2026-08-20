const Category = require('../../models/Category');
const Transaction = require('../../models/Transaction');
const { INTENTS, INTENT_VERSION } = require('./intentTaxonomy');
const { normalizeArabic, transliterateFranco } = require('./nlpParser');

async function migrateCategoryIntents(userId) {
  const categories = await Category.find({ user: userId });
  let migrated = 0;
  
  for (const category of categories) {
    if (category.intent && category.intentVersion === INTENT_VERSION) continue;
    
    const transactions = await Transaction.find({ category: category._id, user: userId }).select('title').lean();
    const textEvidence = [normalizeArabic(category.name), transliterateFranco(category.name)];
    
    transactions.forEach(t => {
      if (t.title) {
        textEvidence.push(normalizeArabic(t.title));
        textEvidence.push(transliterateFranco(t.title));
      }
    });
    
    const combinedEvidence = textEvidence.join(' ');
    
    const scores = {};
    for (const intent of INTENTS) {
      let matches = 0;
      for (const kw of intent.keywords) {
        const normKw = normalizeArabic(kw);
        const regex = new RegExp(`(?:^|\\s|[بفلك]|لل)${normKw}(?:\\s|$)`, 'gi');
        const count = (combinedEvidence.match(regex) || []).length;
        
        if (normalizeArabic(category.name).includes(normKw) || transliterateFranco(category.name).includes(normKw)) {
           matches += 3; 
        }
        matches += count;
      }
      if (matches > 0) scores[intent.id] = matches;
    }
    
    // Find highest score
    let bestIntent = null;
    let maxScore = 0;
    for (const [id, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = id;
      }
    }
    
    // Calculate confidence
    let confidence = 0;
    if (maxScore > 0) {
       confidence = Math.min(0.4 + (maxScore * 0.1), 0.98); 
    }
    
    // If we're not at least 50% confident, don't force a category intent
    if (confidence < 0.5) {
       bestIntent = null;
       confidence = 0.3; // Low confidence
    }
    
    await Category.updateOne({ _id: category._id }, {
      $set: {
        intent: bestIntent,
        intentConfidence: confidence,
        intentSource: 'automatic',
        intentVersion: INTENT_VERSION
      }
    });
    migrated++;
  }
  
  return migrated;
}

module.exports = { migrateCategoryIntents };
