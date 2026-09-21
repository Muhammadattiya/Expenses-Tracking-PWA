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

  // Navigate to Step 2
  await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
  let nextBtn = await page.$('header button:last-child');
  await nextBtn.click();
  await page.waitForTimeout(600);

  // Navigate to Step 3
  await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
  nextBtn = await page.$('header button:last-child');
  await nextBtn.click();
  await page.waitForTimeout(400);

  // Dismiss overlay on Step 3
  try {
    const overlay = await page.waitForSelector('#income-overlay', { timeout: 1500 });
    if (overlay) {
      await overlay.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  await page.waitForTimeout(400);

  // Click 20,000 preset button
  const presetBtn = await page.waitForSelector('button:has-text("20,000")', { timeout: 3000 });
  if (presetBtn) {
    await presetBtn.click();
    await page.waitForTimeout(400);
  }

  // Click 25th payday button
  const paydayBtn = await page.waitForSelector('button:has-text("25")', { timeout: 3000 });
  if (paydayBtn) {
    await paydayBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: 'scripts/verify_card_minted_20k.png' });
  console.log('Saved scripts/verify_card_minted_20k.png');

  // Check scrollbars
  const step3Scroll = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      mainScrolls: main ? main.scrollHeight > main.clientHeight : false,
      bodyScrolls: document.body.scrollHeight > window.innerHeight
    };
  });
  console.log('Step 3 Scroll Check:', step3Scroll);

  await browser.close();
})();
