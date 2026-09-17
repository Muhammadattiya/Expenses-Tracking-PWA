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
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Set language to 'ar' in localStorage key 'finova-lang'
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('2. Navigating to /receivables in Arabic...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Capture Arabic view
  await page.screenshot({ path: 'scratch/debts_hardened_arabic.png' });
  console.log('Saved scratch/debts_hardened_arabic.png');

  // Verify Arabic strings on page
  const titleText = await page.textContent('h1');
  console.log('Page Title (Arabic):', titleText?.trim());

  const heroTexts = await page.textContent('section');
  console.log('Hero section contains Arabic title:', heroTexts?.includes('إجمالي المستحق لي'));
  console.log('Hero section contains English "Total Owed"?', heroTexts?.includes('Total Owed'));

  // Verify personal debts tab in Arabic
  await page.click('button[role="tab"]#tab-personal, button:has-text("ديون شخصية")');
  await page.waitForTimeout(600);

  const pdSection = await page.textContent('section');
  console.log('Personal debts hero contains Arabic "ديون عليّ"?', pdSection?.includes('ديون عليّ'));
  console.log('Personal debts hero contains Arabic "ديون لي"?', pdSection?.includes('ديون لي'));

  await page.screenshot({ path: 'scratch/debts_hardened_arabic_personal.png' });
  console.log('Saved scratch/debts_hardened_arabic_personal.png');

  await browser.close();
  console.log('--- Arabic Verification Complete ---');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
