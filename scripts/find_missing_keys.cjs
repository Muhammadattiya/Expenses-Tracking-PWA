const fs = require('fs');
const path = require('path');

const rawAr = require('../frontend/src/locales/ar.js');
const rawEn = require('../frontend/src/locales/en.js');
const ar = rawAr.default || rawAr;
const en = rawEn.default || rawEn;

function getNested(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full, fileList);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      fileList.push(full);
    }
  }
  return fileList;
}

const srcFiles = scanDir(path.join(__dirname, '../frontend/src'));
const usedKeys = new Set();

const regexes = [
  /\bt\(\s*['"]([^'"]+)['"]/g,
  /\btKey:\s*['"]([^'"]+)['"]/g,
  /\btitleKey:\s*['"]([^'"]+)['"]/g,
  /\bdescriptionKey:\s*['"]([^'"]+)['"]/g,
  /\bkey:\s*['"](sandbox\.[^'"]+)['"]/g
];

for (const file of srcFiles) {
  if (file.includes('locales')) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const re of regexes) {
    let m;
    while ((m = re.exec(content)) !== null) {
      if (!m[1].includes('${') && !m[1].startsWith('http') && !m[1].includes(' ')) {
        usedKeys.add(m[1]);
      }
    }
  }
}

console.log('Total used keys found in code:', usedKeys.size);

const missingInAr = [];
const missingInEn = [];

for (const key of Array.from(usedKeys).sort()) {
  if (getNested(ar, key) === undefined) {
    missingInAr.push(key);
  }
  if (getNested(en, key) === undefined) {
    missingInEn.push(key);
  }
}

console.log('--- Missing in AR (' + missingInAr.length + ') ---');
console.log(JSON.stringify(missingInAr, null, 2));

console.log('--- Missing in EN (' + missingInEn.length + ') ---');
console.log(JSON.stringify(missingInEn, null, 2));
