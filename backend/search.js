const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results.push(...searchFiles(fullPath));
      }
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('intent') || lines[i].includes('Category.')) {
          results.push(`${fullPath}:${i+1}:${lines[i].trim()}`);
        }
      }
    }
  }
  return results;
}

const hits = searchFiles('.');
hits.forEach(h => console.log(h));
