import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function captureAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    locale: 'ar-EG'
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // Reset onboarding
  await page.evaluate(async () => {
    await fetch('http://localhost:5000/api/auth/reset-onboarding', {
      method: 'PUT',
      credentials: 'include'
    });
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    user.hasCompletedOnboarding = false;
    localStorage.setItem('auth_user', JSON.stringify(user));
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  for (let step = 1; step <= 10; step++) {
    console.log(`Capturing step ${step}...`);
    // If step 3, let the overlay finish
    if (step === 3) {
      await page.waitForTimeout(2700);
    }
    await page.screenshot({ path: `scripts/audit_step_${step}.png` });

    if (step < 10) {
      const nextBtn = page.locator('header button').last();
      await nextBtn.click();
      await page.waitForTimeout(800);
    }
  }

  console.log('All 10 steps captured!');
  await browser.close();
}

captureAll().catch(console.error);
