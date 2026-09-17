import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function waitForData(p) {
  // Wait for skeletons to disappear and content sections to appear
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

  // Desktop context
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });
  const page = await desktopCtx.newPage();

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  console.log('2. Navigating to /receivables (Desktop)...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await waitForData(page);

  // Group Expenses tab (Desktop)
  await page.screenshot({ path: 'scratch/layout_desktop_group.png', fullPage: false });
  console.log('Saved scratch/layout_desktop_group.png');

  // Personal Debts tab (Desktop)
  await page.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts"), button:has-text("ديون شخصية")');
  await waitForData(page);
  await page.screenshot({ path: 'scratch/layout_desktop_personal.png', fullPage: false });
  console.log('Saved scratch/layout_desktop_personal.png');

  // Mobile Context
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileCtx.newPage();

  // Transfer cookies & local storage
  const storageState = await desktopCtx.storageState();
  await mobileCtx.addCookies(storageState.cookies);

  console.log('3. Navigating to /receivables (Mobile)...');
  await mobilePage.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await waitForData(mobilePage);

  await mobilePage.screenshot({ path: 'scratch/layout_mobile_group.png', fullPage: false });
  console.log('Saved scratch/layout_mobile_group.png');

  await mobilePage.click('button[role="tab"]#tab-personal, button:has-text("Personal Debts"), button:has-text("ديون شخصية")');
  await waitForData(mobilePage);
  await mobilePage.screenshot({ path: 'scratch/layout_mobile_personal.png', fullPage: false });
  console.log('Saved scratch/layout_mobile_personal.png');

  // Arabic Context
  console.log('4. Testing Arabic RTL layout...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForData(page);

  await page.screenshot({ path: 'scratch/layout_arabic_group.png', fullPage: false });
  console.log('Saved scratch/layout_arabic_group.png');

  await page.click('button[role="tab"]#tab-personal, button:has-text("ديون شخصية")');
  await waitForData(page);
  await page.screenshot({ path: 'scratch/layout_arabic_personal.png', fullPage: false });
  console.log('Saved scratch/layout_arabic_personal.png');

  // Reset back to English
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await browser.close();
  console.log('All layout verification screenshots captured successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
