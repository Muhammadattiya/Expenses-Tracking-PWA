import { execSync } from 'child_process';

const raw = execSync('node scripts/audit_all_modals.mjs').toString();
const data = JSON.parse(raw);

console.log('=== APPLICATION-WIDE MODAL AUDIT SUMMARY ===');
console.log('Total Modals Analyzed:', data.length);

const missingPortal = data.filter(d => d.issues.some(i => i.detail.includes('Missing createPortal')));
console.log('\n--- 1. Missing createPortal (Rule 8 violation) ---');
console.log(`Count: ${missingPortal.length}`);
missingPortal.forEach(d => console.log(`  - ${d.file}`));

const missingEscape = data.filter(d => d.issues.some(i => i.detail.includes('No Escape key listener')));
console.log('\n--- 2. Missing Escape Key Dismissal ---');
console.log(`Count: ${missingEscape.length} / ${data.length}`);
missingEscape.forEach(d => console.log(`  - ${d.file}`));

const missingRole = data.filter(d => d.issues.some(i => i.detail.includes('Missing role=')));
console.log('\n--- 3. Missing role="dialog" / "alertdialog" ---');
console.log(`Count: ${missingRole.length} / ${data.length}`);
missingRole.forEach(d => console.log(`  - ${d.file}`));

const missingLabelFor = data.filter(d => d.issues.some(i => i.detail.includes('without htmlFor')));
console.log('\n--- 4. Unbound Form Labels (<label> without htmlFor) ---');
console.log(`Count: ${missingLabelFor.length}`);
missingLabelFor.forEach(d => console.log(`  - ${d.file}`));

const missingStickyFooter = data.filter(d => d.issues.some(i => i.detail.includes('without a sticky actions footer')));
console.log('\n--- 5. Long Form Modals Lacking Sticky Action Bar ---');
console.log(`Count: ${missingStickyFooter.length}`);
missingStickyFooter.forEach(d => console.log(`  - ${d.file}`));

const smallTargets = data.filter(d => d.issues.some(i => i.detail.includes('small interactive icon buttons')));
console.log('\n--- 6. Touch Targets < 44px (WCAG 2.5.5 / 2.5.8) ---');
console.log(`Count: ${smallTargets.length}`);
smallTargets.forEach(d => console.log(`  - ${d.file}`));

const buttonDrift = data.filter(d => d.issues.some(i => i.detail.includes('flat opaque solid rectangles')));
console.log('\n--- 7. Button Styling Drift (Solid flat vs Copper Glass) ---');
console.log(`Count: ${buttonDrift.length}`);
buttonDrift.forEach(d => console.log(`  - ${d.file}`));

const windowConfirm = data.filter(d => d.issues.some(i => i.detail.includes('window.confirm')));
console.log('\n--- 8. Native window.confirm usage (Rule 12 violation) ---');
console.log(`Count: ${windowConfirm.length}`);
windowConfirm.forEach(d => console.log(`  - ${d.file}`));
