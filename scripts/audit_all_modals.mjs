import fs from 'fs';
import path from 'path';

const SRC_DIR = 'd:/expenses-tracker/frontend/src';

function findFiles(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, filter));
    } else if (filter(fullPath)) {
      results.push(fullPath);
    }
  });
  return results;
}

// Find all modal-like files
const modalFiles = findFiles(SRC_DIR, (f) => {
  const base = path.basename(f);
  return (
    (base.endsWith('Modal.jsx') ||
      base.endsWith('Modal.js') ||
      base === 'ConfirmModal.jsx' ||
      base === 'QuickAddModal.jsx' ||
      base === 'SimulationModals.jsx' ||
      base === 'CategoryClarificationManager.jsx') &&
    !f.includes('node_modules')
  );
});

// Also check profile and planning tabs for inline modals
const inlineModalFiles = [
  'd:/expenses-tracker/frontend/src/components/profile/AccountManagement.jsx',
  'd:/expenses-tracker/frontend/src/components/profile/CategoryManagement.jsx',
  'd:/expenses-tracker/frontend/src/components/planning/EmergencyFundTab.jsx',
  'd:/expenses-tracker/frontend/src/components/planning/SavingsTab.jsx',
  'd:/expenses-tracker/frontend/src/components/emergency/FinancialShieldWidget.jsx',
  'd:/expenses-tracker/frontend/src/components/agent/AgentModal.jsx'
].filter(f => fs.existsSync(f));

const allTargets = Array.from(new Set([...modalFiles, ...inlineModalFiles]));

const auditResults = [];

for (const filePath of allTargets) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');

  const issues = [];
  const positive = [];

  // 1. React Portal check
  const usesPortal = content.includes('createPortal');
  if (!usesPortal) {
    issues.push({
      category: 'Implementation Integrity / Rule 8',
      severity: 'P1',
      detail: 'Missing createPortal(..., document.body) - mounts directly in component DOM tree, vulnerable to z-index and transform stacking context bugs.'
    });
  } else {
    positive.push('Uses createPortal');
  }

  // 2. Z-Index check
  const zIndexMatches = content.match(/z-\[(\d+)\]|z-(\d+)/g) || [];
  const lowZIndex = zIndexMatches.some(z => {
    const num = parseInt(z.replace(/[^0-9]/g, ''), 10);
    return num > 0 && num < 90; // BottomNav is z-[90], modals must be z-[100]
  });
  if (lowZIndex && (content.includes('fixed inset-0') || usesPortal)) {
    issues.push({
      category: 'Responsive / Layering',
      severity: 'P1',
      detail: `Uses low z-index (< z-[90]) on modal backdrop/container (${zIndexMatches.join(', ')}). May render under floating BottomNav (z-[90]).`
    });
  }

  // 3. Escape Key check
  const hasEscapeListener = content.includes('Escape') || content.includes('key === "Escape"') || content.includes("key === 'Escape'");
  if (!hasEscapeListener) {
    issues.push({
      category: 'Accessibility',
      severity: 'P1',
      detail: 'No Escape key listener. Keyboard users cannot dismiss the modal via Escape.'
    });
  } else {
    positive.push('Has Escape listener');
  }

  // 4. ARIA Dialog Semantics
  const hasRoleDialog = content.includes('role="dialog"') || content.includes("role='dialog'") || content.includes('role="alertdialog"');
  const hasAriaModal = content.includes('aria-modal="true"') || content.includes("aria-modal='true'");
  const hasAriaLabel = content.includes('aria-labelledby') || content.includes('aria-label=');

  if (!hasRoleDialog) {
    issues.push({
      category: 'Accessibility',
      severity: 'P1',
      detail: 'Missing role="dialog" or role="alertdialog" on modal container.'
    });
  }
  if (!hasAriaModal) {
    issues.push({
      category: 'Accessibility',
      severity: 'P2',
      detail: 'Missing aria-modal="true" on dialog element.'
    });
  }
  if (!hasAriaLabel) {
    issues.push({
      category: 'Accessibility',
      severity: 'P2',
      detail: 'Missing aria-labelledby or aria-label identifying the dialog purpose to assistive tech.'
    });
  }

  // 5. Form label associations
  const hasLabelWithoutFor = (content.match(/<label(?![^>]*htmlFor)[^>]*>/g) || []).length;
  const totalInputs = (content.match(/<input|<select|<textarea/g) || []).length;
  if (hasLabelWithoutFor > 0 && totalInputs > 0) {
    issues.push({
      category: 'Accessibility',
      severity: 'P1',
      detail: `Found ${hasLabelWithoutFor} <label> element(s) without htmlFor binding to input IDs.`
    });
  }

  // 6. Sticky footer / scroll truncation check
  const hasStickyFooter = content.includes('sticky bottom-0');
  const hasMaxHeight = content.includes('max-h-') || content.includes('max-h=[');
  const entireModalScrolls = content.includes('overflow-y-auto') && !hasStickyFooter && totalInputs >= 4;
  if (entireModalScrolls) {
    issues.push({
      category: 'Responsive Design / Ergonomics',
      severity: 'P1',
      detail: 'Modal body with 4+ inputs scrolls as a whole without a sticky actions footer. Action buttons (Save/Cancel) risk being pushed below the fold on mobile and small laptop viewports.'
    });
  } else if (hasStickyFooter) {
    positive.push('Sticky footer actions');
  }

  // 7. Small Touch Targets (<44px)
  const buttonTags = content.match(/<button[^>]*>/g) || [];
  const smallCloseBtn = buttonTags.some(btn => {
    // If it has explicit 44px dimension (w-11, min-w-[44px], etc.), it passes
    if (btn.includes('w-11') || btn.includes('h-11') || btn.includes('min-h-[44px]') || btn.includes('h-12') || btn.includes('min-w-11') || btn.includes('min-h-11')) {
      return false;
    }
    // Check for small padding specifically on icon buttons (not gap-2, not flex-[2], not py-3)
    return /(?:^|[\s"'])p-(1|1\.5|2)(?:[\s"'])/.test(btn);
  });
  if (smallCloseBtn) {
    issues.push({
      category: 'Accessibility / Touch Targets',
      severity: 'P1',
      detail: 'Contains small interactive icon buttons (p-1, p-1.5, or p-2 resulting in < 44×44px hit targets).'
    });
  }

  // 8. Design System Button Drift
  const flatSolidButtons = (content.match(/className="[^"]*(bg-blue-600|bg-emerald-600|bg-green-600|bg-red-600|bg-amber-600|bg-\[#8D6346\] hover:bg-)[^"]*"/g) || []);
  const usesRoundedXlInsteadOfFull = flatSolidButtons.some(b => b.includes('rounded-xl') || b.includes('rounded-2xl') || b.includes('rounded-lg'));
  if (usesRoundedXlInsteadOfFull) {
    issues.push({
      category: 'Theming & Tokens',
      severity: 'P2',
      detail: 'Primary actions use flat opaque solid rectangles (rounded-xl/2xl with solid bg) rather than the signature translucent Copper Glass pill archetype (rounded-full bg-[#8D6346]/30).'
    });
  }

  // 9. Native window.confirm check
  if (content.includes('window.confirm(') || content.includes('confirm(')) {
    // Exclude ConfirmModal definition itself
    if (path.basename(filePath) !== 'ConfirmModal.jsx') {
      issues.push({
        category: 'Implementation Integrity / Rule 12',
        severity: 'P1',
        detail: 'Uses native browser window.confirm() instead of the project <ConfirmModal /> component.'
      });
    }
  }

  auditResults.push({
    file: relativePath,
    fullPath: filePath,
    issues,
    positive
  });
}

console.log(JSON.stringify(auditResults, null, 2));
