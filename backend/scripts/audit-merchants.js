const { classifyMerchant } = require('../services/merchantIntelligence/globalMerchantDictionary');

const testCases = [
  // A. Exact Known Merchants
  "STARBUCKS", "CILANTRO", "NOLA", "TBS", "KFC", "MCDONALDS", "BAZOOQA", 
  "HEART ATTACK", "MORI SUSHI", "CRAVE", "CARREFOUR", "SPINNEYS", "SEOUDI", 
  "GOURMET", "TALABAT MART", "UBER", "CAREEM", "INDRIVE", "SWVL", "GO BUS", 
  "SEIF", "EL EZABY", "VEZEETA", "ALFA",
  
  // B. Normalization variants
  "uber", "Uber", "UBER EGYPT", "UBER EG", "UBER CAIRO",
  "FAWRYPF*MCDONALDS", "PAYMOB*STARBUCKS",
  "SPINNEYS 123", "CARREFOUR 123", "SEOUDI 123",
  "قهوة", "مواصلات", 
  
  // C. Adversarial
  "AMAZON", "AMAZON EGYPT", "AMAZON WEB SERVICES", "AMAZON FRESH", "AMAZONXYZ",
  "STARBUCKS CAIRO", "STARBUCKS123", "SPINNEYS 123", "CARREFOUR MAADI", "UBER EATS",
  "CAIRO BANK", "BANK ABC", "FAWRY", "PAYMOB", "PAYTABS", "AMAN", "OPAY"
];

const results = [];
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = classifyMerchant(tc);
  results.push({
    merchant: tc,
    normalized: result.normalizedMerchant,
    intent: result.intentId,
    source: result.source
  });
}

console.log(JSON.stringify(results, null, 2));
