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
  await p.waitForTimeout(1000);
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

  // Set English
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  console.log('2. Navigating to /receivables (English)...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await waitForData(page);

  // Focus into an input in Group Expenses to verify copper focus ring
  const groupInput = await page.$('input[placeholder="Amount to collect"]');
  if (groupInput) {
    console.log('Focusing group expense input...');
    await groupInput.focus();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: 'scratch/polish_group_focus.png' });
  console.log('Captured scratch/polish_group_focus.png');

  // Switch to Personal Debts
  console.log('3. Navigating to Personal Debts...');
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts")');
  await waitForData(page);

  // Open repayment form
  const payBtn = await page.$('button:has-text("Pay Debt"), button:has-text("Collect")');
  if (payBtn) {
    await payBtn.click();
    await page.waitForTimeout(500);
    const amountInput = await page.$('input[placeholder="Amount"]');
    if (amountInput) {
      await amountInput.focus();
      await page.waitForTimeout(400);
    }
  }
  await page.screenshot({ path: 'scratch/polish_personal_focus.png' });
  console.log('Captured scratch/polish_personal_focus.png');

  // Check touch target heights of interactive controls
  const minTouchTargetsValid = await page.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll('button, input, [role="tab"]'));
    const issues = [];
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      // Only check visible elements that are primary actions/tabs
      if (rect.width > 0 && rect.height > 0) {
        if (el.getAttribute('role') === 'tab' && rect.height < 44) {
          issues.push({ role: 'tab', height: rect.height, text: el.innerText });
        }
      }
    }
    return { issueCount: issues.length, issues };
  });
  console.log('Touch target assessment on tabs:', minTouchTargetsValid);

  // Test Arabic RTL
  console.log('4. Switching to Arabic (RTL)...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await waitForData(page);
  await page.screenshot({ path: 'scratch/polish_arabic_group.png' });
  console.log('Captured scratch/polish_arabic_group.png');

  await page.click('button[role="tab"]#tab-personal, button:has-text("ديون شخصية")');
  await waitForData(page);
  await page.screenshot({ path: 'scratch/polish_arabic_personal.png' });
  console.log('Captured scratch/polish_arabic_personal.png');

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
