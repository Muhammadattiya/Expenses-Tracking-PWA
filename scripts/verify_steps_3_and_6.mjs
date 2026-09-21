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

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/verify_step3_redesign.png' });
  console.log('Saved scripts/verify_step3_redesign.png');

  // Check scrollbars on step 3
  const step3Scroll = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      mainScrolls: main ? main.scrollHeight > main.clientHeight : false,
      bodyScrolls: document.body.scrollHeight > window.innerHeight
    };
  });
  console.log('Step 3 Scroll Check:', step3Scroll);

  // Navigate through step 4 and 5 to reach step 6
  for (let s = 3; s <= 5; s++) {
    await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
    nextBtn = await page.$('header button:last-child');
    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'scripts/verify_step6_obsidian.png' });
  console.log('Saved scripts/verify_step6_obsidian.png');

  // Check scrollbars on step 6
  const step6Scroll = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      mainScrolls: main ? main.scrollHeight > main.clientHeight : false,
      bodyScrolls: document.body.scrollHeight > window.innerHeight
    };
  });
  console.log('Step 6 Scroll Check:', step6Scroll);

  await browser.close();
})();
