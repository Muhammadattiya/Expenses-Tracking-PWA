import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    locale: 'ar'
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 8000 });

  await page.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
    cached.hasCompletedOnboarding = false;
    localStorage.setItem('auth_user', JSON.stringify(cached));
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
  await page.waitForTimeout(400);

  // Navigate to step 2
  let nextBtn = await page.$('header button:last-child');
  await nextBtn.click();
  await page.waitForTimeout(600);

  // Navigate to step 3 (overlay appears)
  await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
  nextBtn = await page.$('header button:last-child');
  await nextBtn.click();
  await page.waitForTimeout(300);

  // Capture overlay
  await page.screenshot({ path: 'scripts/audit_verified_step_3_overlay.png' });
  console.log('Saved scripts/audit_verified_step_3_overlay.png');

  // Wait for overlay to fade out (auto-dismiss is 1800ms)
  await page.waitForTimeout(2200);

  // Capture step 3 form
  await page.screenshot({ path: 'scripts/audit_verified_step_3_form.png' });
  console.log('Saved scripts/audit_verified_step_3_form.png');

  await browser.close();
})();
