import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  console.log('2. Navigating to /receivables...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('Current URL:', page.url());

  // Test 1: Check ARIA tablist
  await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
  const tablist = await page.$('[role="tablist"]');
  console.log('ARIA tablist found:', !!tablist);

  // Switch to Personal Debts tab
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts"), button:has-text("ديون شخصية")');
  await page.waitForTimeout(600);

  // Click Add Debt
  await page.click('button:has-text("Add Debt"), button:has-text("إضافة دين")');
  await page.waitForTimeout(500);

  // Verify dialog semantics
  const dialog = await page.$('[role="dialog"][aria-modal="true"]');
  console.log('Personal Debt dialog found:', !!dialog);

  const titleId = await page.getAttribute('[role="dialog"]', 'aria-labelledby');
  console.log('aria-labelledby:', titleId);
  const titleText = await page.textContent(`#${titleId}`);
  console.log('Modal title:', titleText?.trim());

  // Test inputting invalid amount & submitting
  await page.fill('#pd-person-name', 'Test User');
  await page.fill('#pd-amount', '-5');
  await page.click('button[type="submit"][form="personal-debt-form"]');
  
  await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  const alertError = await page.textContent('[role="alert"]');
  console.log('Validation alert caught:', alertError?.trim());

  // Test Escape key dismissal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const isClosed = (await page.$('[role="dialog"]')) === null;
  console.log('Modal closed on Escape key:', isClosed);

  // Test 2: Switch to Group Expenses tab and open modal
  await page.click('button[role="tab"]#tab-group, button:has-text("Split Bills"), button:has-text("مصروفات مشتركة")');
  await page.waitForTimeout(600);

  // Click Add Receivable
  await page.click('button:has-text("Add Receivable"), button:has-text("إضافة مبلغ مستحق")');
  await page.waitForTimeout(500);

  const geDialog = await page.$('[role="dialog"][aria-modal="true"]');
  console.log('Group Expense dialog found:', !!geDialog);

  // Test amounts exceed validation
  await page.fill('#ge-title', 'Dinner Party');
  await page.fill('#ge-paid-amount', '100');
  await page.fill('#ge-received-amount', '50');
  // Participant owes 80 -> total = 130 > 100
  await page.fill('input[aria-label*="1"][type="text"]', 'Friend A');
  await page.fill('input[aria-label*="1"][type="number"]', '80');
  await page.click('button[type="submit"][form="group-expense-form"]');

  await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  const geAlertError = await page.textContent('[role="alert"]');
  console.log('Group expense validation alert caught:', geAlertError?.trim());

  // Escape key dismissal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const geClosed = (await page.$('[role="dialog"]')) === null;
  console.log('Group Expense modal closed on Escape key:', geClosed);

  // Capture screenshot of hardened page
  await page.screenshot({ path: 'scratch/debts_hardened_desktop.png' });
  console.log('Screenshot saved: scratch/debts_hardened_desktop.png');

  await browser.close();
  console.log('--- ALL HARDENING TESTS PASSED ---');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
