import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function testOnboarding() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
  });

  const page = await context.newPage();
  
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  if (page.url() !== 'http://localhost:5173/onboarding') {
    await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  }

  // Step 0 -> Step 1 -> Step 2
  await page.locator('header button').last().click();
  await page.waitForTimeout(600);
  await page.locator('header button').last().click();
  
  // Wait 3.2s for overlay to fade out
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/6e93ad9c-602d-4778-a0ef-11ecf0eb05cd/step2_salary_card.png' });

  // Step 3 (Tracking Cycle)
  await page.locator('header button').last().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/6e93ad9c-602d-4778-a0ef-11ecf0eb05cd/step3_tracking_cycle.png' });

  await browser.close();
}

testOnboarding().catch(console.error);
