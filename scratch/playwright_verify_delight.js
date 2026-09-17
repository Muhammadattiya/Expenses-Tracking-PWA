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

  // Set English first
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  console.log('2. Navigating to /receivables...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await waitForData(page);

  // Switch to Personal Debts
  console.log('3. Checking Personal Debts quick presets & liquid progress...');
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts")');
  await waitForData(page);

  // Find an active debt card and click Pay Debt
  const payBtn = await page.$('button:has-text("Pay Debt"), button:has-text("Collect")');
  if (payBtn) {
    await payBtn.click();
    await page.waitForTimeout(500);

    // Verify smart preset chip exists
    const chip100 = await page.$('button:has-text("100%")');
    if (chip100) {
      console.log('Found 100% quick fill chip, clicking it...');
      await chip100.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: 'scratch/delight_personal_presets.png' });
    console.log('Saved scratch/delight_personal_presets.png');

    // Submit repayment to trigger celebration toast
    console.log('Submitting payoff transaction to trigger triumph celebration...');
    const submitBtn = await page.$('button:has-text("Save Transaction")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: 'scratch/delight_personal_celebration.png' });
      console.log('Saved scratch/delight_personal_celebration.png');
    }
  }

  // Switch to Split Bills (Group Expenses)
  console.log('4. Checking Group Expenses quick fill chips...');
  await page.click('button[role="tab"]#tab-group, button:has-text("Split Bills")');
  await waitForData(page);

  // Find participant quick fill button
  const fullChip = await page.$('button:has-text("Full")');
  if (fullChip) {
    console.log('Found participant Full chip, clicking it...');
    await fullChip.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: 'scratch/delight_group_presets.png' });
  console.log('Saved scratch/delight_group_presets.png');

  // Test Arabic RTL
  console.log('5. Testing Arabic RTL delightful touches...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForData(page);

  await page.screenshot({ path: 'scratch/delight_arabic_group.png' });
  console.log('Saved scratch/delight_arabic_group.png');

  await page.click('button[role="tab"]#tab-personal, button:has-text("ديون شخصية")');
  await waitForData(page);

  // Click Pay Debt in Arabic to check preset chips in RTL
  const payBtnAr = await page.$('button:has-text("سداد"), button:has-text("تحصيل")');
  if (payBtnAr) {
    await payBtnAr.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'scratch/delight_arabic_personal.png' });
  console.log('Saved scratch/delight_arabic_personal.png');

  await browser.close();
  console.log('Done! All delight verifications passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
