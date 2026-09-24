import fs from 'fs';

const files = [
  'frontend/src/components/modals/EditTransactionModal.jsx',
  'frontend/src/components/modals/QuickAddModal.jsx',
  'frontend/src/components/modals/BillModal.jsx',
  'frontend/src/components/modals/CalculatorModal.jsx',
  'frontend/src/components/modals/EditRecurringTransactionModal.jsx',
  'frontend/src/components/modals/RecurringSettingsModal.jsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const buttonTags = content.match(/<button[^>]*>/g) || [];
  buttonTags.forEach(btn => {
    const hasDim = btn.includes('w-11') || btn.includes('h-11') || btn.includes('min-h-[44px]') || btn.includes('h-12') || btn.includes('p-3') || btn.includes('p-2.5');
    const small = btn.includes('p-1.5') || btn.includes('p-1 ') || btn.includes('p-2 ') || btn.includes('p-2"');
    if (small && !hasDim) {
      console.log(`[${file}] FLAGGED:`, btn.replace(/\n\s+/g, ' '));
    }
  });
}
