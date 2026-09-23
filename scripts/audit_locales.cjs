const fs = require('fs');
const path = require('path');

const arCode = fs.readFileSync(path.join(__dirname, '../frontend/src/locales/ar.js'), 'utf8');
const enCode = fs.readFileSync(path.join(__dirname, '../frontend/src/locales/en.js'), 'utf8');

function parseLocale(code) {
  const jsonCode = code.replace(/export\s+default\s+/, 'return ');
  return new Function(jsonCode)();
}

const ar = parseLocale(arCode);
const en = parseLocale(enCode);

function getNested(obj, keyPath) {
  const parts = keyPath.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[p];
  }
  return curr;
}

const filesToCheck = [
  'frontend/src/pages/Sandbox.jsx',
  'frontend/src/components/sandbox/CommitPlanModal.jsx',
  'frontend/src/components/sandbox/DecisionPanel.jsx',
  'frontend/src/components/sandbox/ResultsView.jsx',
  'frontend/src/components/sandbox/TrajectoryChart.jsx',
  'frontend/src/components/savings/SavingsGoalsList.jsx',
  'frontend/src/components/savings/GoalJarCard.jsx',
  'frontend/src/components/savings/GoalModal.jsx',
  'frontend/src/components/savings/GoalContributeModal.jsx',
  'frontend/src/components/emergency/FinancialShieldWidget.jsx',
  'frontend/src/components/debts/InstallmentCard.jsx',
  'frontend/src/components/debts/InstallmentModal.jsx',
  'frontend/src/components/debts/InstallmentsList.jsx',
  'frontend/src/pages/Receivables.jsx',
  'frontend/src/pages/Dashboard.jsx'
];

const checkedKeys = new Map();
const regex = /t\(\s*['"]([^'"]+)['"]/g;

for (const relFile of filesToCheck) {
  const fullPath = path.join(__dirname, '..', relFile);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    if (key.includes(' ') || key === 'tab' || key === '-' || key === 'open-nova-agent') continue;
    if (!checkedKeys.has(key)) {
      checkedKeys.set(key, new Set());
    }
    checkedKeys.get(key).add(relFile);
  }
}

const missingInAr = [];
const missingInEn = [];

for (const [key, files] of checkedKeys.entries()) {
  if (getNested(ar, key) === undefined) {
    missingInAr.push(key);
  }
  if (getNested(en, key) === undefined) {
    missingInEn.push(key);
  }
}

console.log('Missing in AR (' + missingInAr.length + '):');
console.log(missingInAr.sort());
console.log('\nMissing in EN (' + missingInEn.length + '):');
console.log(missingInEn.sort());
