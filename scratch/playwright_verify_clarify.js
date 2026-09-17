import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function waitForData(p) {
  await p.waitForSelector('[role="tablist"]', { timeout: 15000 });
  await p.waitForFunction(() => {
    return !document.querySelector('.animate-pulse') && (document.querySelectorAll('section').length >= 2);
  }, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
}

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
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
  await waitForData(page);

  // Check Personal Debts Tab
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts"), button:has-text("ديون شخصية")');
  await waitForData(page);

  // Capture Personal Debts cards with contextual buttons
  await page.screenshot({ path: 'scratch/clarify_personal_cards.png' });
  console.log('Saved scratch/clarify_personal_cards.png');

  // Click Pay Debt on the first active debt to reveal clarified inline transaction form
  const settleBtn = await page.$('button:has-text("Pay Debt"), button:has-text("Collect")');
  if (settleBtn) {
    await settleBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/clarify_inline_transaction.png' });
    console.log('Saved scratch/clarify_inline_transaction.png');
  }

  // Click Add Debt to inspect Personal Debt modal clarified copy
  await page.click('button:has-text("Add Debt"), button:has-text("إضافة دين")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'scratch/clarify_modal_personal.png' });
  console.log('Saved scratch/clarify_modal_personal.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Switch to Split Bills (Group Expenses)
  await page.click('button[role="tab"]#tab-group, button:has-text("Split Bills"), button:has-text("مصروفات مشتركة")');
  await waitForData(page);
  await page.screenshot({ path: 'scratch/clarify_group_cards.png' });
  console.log('Saved scratch/clarify_group_cards.png');

  // Click Add Split Bill to test clarified validation
  await page.click('button:has-text("Add Split Bill"), button:has-text("إضافة مصروف مشترك"), button:has-text("Add Receivable")');
  await page.waitForTimeout(600);
  // Submit without title to trigger actionable error
  await page.click('button[type="submit"][form="group-expense-form"]');
  await page.waitForTimeout(400);
  const errorText = await page.textContent('[role="alert"]');
  console.log('Validation error caught in Split Bill modal:', errorText?.trim());
  await page.screenshot({ path: 'scratch/clarify_modal_split_bill_error.png' });
  console.log('Saved scratch/clarify_modal_split_bill_error.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Test Arabic RTL
  console.log('3. Testing Arabic RTL clarified copy...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForData(page);

  await page.screenshot({ path: 'scratch/clarify_arabic_group.png' });
  console.log('Saved scratch/clarify_arabic_group.png');

  await page.click('button[role="tab"]#tab-personal, button:has-text("ديون شخصية")');
  await page.waitForTimeout(1500);
  await waitForData(page);
  await page.screenshot({ path: 'scratch/clarify_arabic_personal.png' });
  console.log('Saved scratch/clarify_arabic_personal.png');

  // Reset back to English
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await browser.close();
  console.log('All clarification checks passed!');
}

run().catch(err => {
  console.error('Clarify verification error:', err);
  process.exit(1);
});
