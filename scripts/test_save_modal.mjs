import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/c687b85c-a621-4b18-a99e-7acb13531eb5';

async function testSaveModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Run template
  const instBtn = await page.$('button:has-text("تقسيط (12 شهر)")');
  if (instBtn) {
    await instBtn.click();
    await page.waitForTimeout(3000);
  }

  // Click Save Scenario button
  console.log('Clicking Save Scenario button...');
  const saveBtn = await page.$('button:has-text("حفظ السيناريو")');
  if (saveBtn) {
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Capture screenshot of the new in-app glass modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_modal_save.png') });
    console.log('Captured sandbox_desktop_ar_modal_save.png');
  }

  await browser.close();
}

testSaveModal().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
