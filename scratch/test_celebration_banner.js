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

  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts")');
  await page.waitForTimeout(1000);

  // Pay off Kareem El-Sayed
  console.log('Paying off Kareem El-Sayed...');
  const payBtn = await page.$('button:has-text("Pay Debt")');
  if (payBtn) {
    await payBtn.click();
    await page.waitForTimeout(500);

    const chip100 = await page.$('button:has-text("100%")');
    if (chip100) await chip100.click();
    await page.waitForTimeout(300);

    const submitBtn = await page.$('button:has-text("Save Transaction")');
    if (submitBtn) {
      await submitBtn.click();
      // Wait for toast to appear
      await page.waitForSelector('[role="status"]', { timeout: 4000 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'scratch/delight_toast_active.png' });
      console.log('Saved scratch/delight_toast_active.png!');
    }
  }

  await browser.close();
}

run().catch(console.error);
