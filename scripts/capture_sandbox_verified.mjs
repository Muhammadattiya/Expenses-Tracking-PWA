import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/7046f07c-abac-4102-a0d6-3b9c895409c6/screenshots';

async function run() {
  console.log('--- Capturing Verified Sandbox Results ---');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1280x800
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await desktopContext.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  console.log('Navigating to Sandbox...');
  await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click pre-built template "تقسيط (12 شهر)"
  const instBtn = await page.$('button:has-text("تقسيط (12 شهر)")');
  if (instBtn) {
    console.log('Clicking template "تقسيط (12 شهر)"...');
    await instBtn.click();
    await page.waitForTimeout(4000);
  }

  // Scroll down smoothly to render full results
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_09_sandbox_complete_verified.png'), fullPage: true });
  console.log('Captured desktop_09_sandbox_complete_verified.png');

  // 2. Mobile iPhone 14
  console.log('Testing Mobile iPhone 14...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14']
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
  await mobilePage.fill('input[type="password"]', '123456789');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });

  await mobilePage.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mInstBtn = await mobilePage.$('button:has-text("تقسيط (12 شهر)")');
  if (mInstBtn) {
    console.log('Clicking template on mobile...');
    await mInstBtn.click();
    await mobilePage.waitForTimeout(4000);
  }

  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_06_sandbox_complete_verified.png'), fullPage: true });
  console.log('Captured mobile_06_sandbox_complete_verified.png');

  await browser.close();
  console.log('--- Done Capturing ---');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
