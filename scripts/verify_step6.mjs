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
  await page.waitForTimeout(600);

  // Click next 5 times to reach step 6
  for (let i = 1; i <= 5; i++) {
    if (i === 3) {
      try {
        const overlay = await page.waitForSelector('#income-overlay', { timeout: 1500 });
        if (overlay) await overlay.click();
        await page.waitForTimeout(400);
      } catch (e) {}
    }
    await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
    const nextBtn = await page.$('header button:last-child');
    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'scripts/audit_verified_step_6_logo.png' });
  console.log('Saved scripts/audit_verified_step_6_logo.png');

  await browser.close();
})();
