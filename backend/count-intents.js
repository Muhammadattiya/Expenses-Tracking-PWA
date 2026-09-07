const fs = require('fs');

function count(file) {
  const content = fs.readFileSync(file, 'utf8');
  const startIndex = content.indexOf('"intents": {');
  if (startIndex === -1) {
    console.log(file, 'No intents found');
    return;
  }
  const endIndex = content.indexOf('  },', startIndex);
  const slice = content.substring(startIndex, endIndex);
  const lines = slice.split('\n').filter(l => l.trim().startsWith('"') && l.trim() !== '"intents": {');
  console.log(file, 'Intents Count:', lines.length);
}

count('../frontend/src/locales/ar.js');
count('../frontend/src/locales/en.js');
