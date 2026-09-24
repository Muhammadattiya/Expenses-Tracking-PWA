import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACTS_DIR = 'd:/expenses-tracker/scripts';

async function testModalFlow(page, name) {
  // 1. Navigate to Bills and open BillModal
  await page.goto('http://localhost:5173/bills');
  await page.waitForSelector('header h1', { timeout: 10000 });
  console.log(`[${name}] Bills header loaded`);

  const addBillBtn = page.locator('button:has-text("فاتورة"), button:has-text("Bill"), button:has(svg.lucide-plus)').first();
  await addBillBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addBillBtn.click();
  console.log(`[${name}] Clicked Add Bill button`);

  const billDialog = page.locator('[role="dialog"]').first();
  await billDialog.waitFor({ state: 'visible', timeout: 5000 });
  const isVisible = await billDialog.isVisible();
  console.log(`[${name}] BillModal visible:`, isVisible);

  if (isVisible) {
    const saveBtn = billDialog.locator('button[type="submit"]');
    if (await saveBtn.isVisible()) {
      const box = await saveBtn.boundingBox();
      console.log(`[${name}] BillModal save button box: ${box.width}x${box.height}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `modal_bill_${name}.png`),
      fullPage: false
    });
    console.log(`[${name}] Saved modal_bill_${name}.png`);

    // Test Escape key dismissal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const stillOpen = await billDialog.isVisible();
    console.log(`[${name}] BillModal dismissed via Escape:`, !stillOpen);
  }
}

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched.');

  // Context 1: Login on Desktop
  const initialContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const page = await initialContext.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('Initial login successful.');

  const storageState = await initialContext.storageState();
  await initialContext.close();

  // Test across all 4 configurations using storageState
  const configs = [
    { name: 'desktop-ar', options: { viewport: { width: 1280, height: 800 } }, lang: 'ar' },
    { name: 'mobile-ar', options: { ...devices['iPhone 14'] }, lang: 'ar' },
    { name: 'desktop-en', options: { viewport: { width: 1280, height: 800 } }, lang: 'en' },
    { name: 'mobile-en', options: { ...devices['iPhone 14'] }, lang: 'en' }
  ];

  for (const config of configs) {
    console.log(`\n--- Running verification for: ${config.name} ---`);
    const ctx = await browser.newContext({
      ...config.options,
      storageState
    });
    const p = await ctx.newPage();
    await p.addInitScript((l) => {
      localStorage.setItem('finova-lang', l);
    }, config.lang);

    await testModalFlow(p, config.name);
    await ctx.close();
  }

  await browser.close();
  console.log('\nAll modal verifications completed successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
