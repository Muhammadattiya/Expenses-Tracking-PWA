const fs = require('fs');
const path = require('path');

const dirs = [
  'frontend/src/components/emergency',
  'frontend/src/components/debts',
  'frontend/src/components/savings',
  'frontend/src/components/sandbox',
  'frontend/src/pages'
];

const arabicRegex = /[\u0600-\u06FF]/;

const findings = [];

dirs.forEach(dir => {
  const fullDir = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullDir)) return;
  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.jsx'));
  files.forEach(file => {
    const filePath = path.join(fullDir, file);
    const relPath = path.relative(path.join(__dirname, '..'), filePath);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (arabicRegex.test(line)) {
        findings.push({
          file: relPath,
          line: idx + 1,
          content: trimmed
        });
      }
    });
  });
});

console.log('Total hardcoded Arabic lines found:', findings.length);
findings.slice(0, 50).forEach(f => {
  console.log(`${f.file}:${f.line}: ${f.content}`);
});
if (findings.length > 50) {
  console.log(`... and ${findings.length - 50} more`);
}
