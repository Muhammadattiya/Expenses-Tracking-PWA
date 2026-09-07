const fs = require('fs');

// 1. Update intentTaxonomy.js
let code = fs.readFileSync('services/quickAdd/intentTaxonomy.js', 'utf8');
const intentsStrMatch = code.match(/const INTENTS = (\[[\s\S]*?\]);\n/);
if (intentsStrMatch) {
  let intents = eval(intentsStrMatch[1]);
  const taxiIntent = intents.find(i => i.id === 'taxi');
  const transIntent = intents.find(i => i.id === 'transportation');
  
  if (taxiIntent && transIntent) {
    transIntent.keywords.push(...taxiIntent.keywords);
    intents = intents.filter(i => i.id !== 'taxi');
    
    code = code.replace(intentsStrMatch[1], JSON.stringify(intents, null, 2));
    fs.writeFileSync('services/quickAdd/intentTaxonomy.js', code);
    console.log('Removed taxi from intentTaxonomy.js');
  }
}

// 2. Update globalMerchants.json
let merch = JSON.parse(fs.readFileSync('data/globalMerchants.json', 'utf8'));
for (const k in merch) {
  if (merch[k] === 'taxi') merch[k] = 'transportation';
}
fs.writeFileSync('data/globalMerchants.json', JSON.stringify(merch, null, 2));
console.log('Updated globalMerchants.json');

// 3. Update test files
function replaceInFile(file, from, to) {
  if (!fs.existsSync(file)) return;
  const c = fs.readFileSync(file, 'utf8').replace(new RegExp(from, 'g'), to);
  fs.writeFileSync(file, c);
}
replaceInFile('test-classifier-expansion.js', '"taxi"', '"transportation"');
replaceInFile('test-merchant-expansion.js', '"taxi"', '"transportation"');
console.log('Updated test files');
