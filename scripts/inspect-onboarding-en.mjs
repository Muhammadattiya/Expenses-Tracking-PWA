import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function inspectEN() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });

  const page = await context.newPage();

  // Match only actual API requests, not Vite module imports
  await page.route(url => {
    const u = url.href;
    return (u.includes(':5000/api/') || u.includes('/api/')) && !u.includes('/src/api/');
  }, async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'test-user',
          id: 'test-user',
          name: 'Gemini Test',
          email: 'gemini@gmail.com',
          hasCompletedOnboarding: false,
          preferences: { currency: 'USD' }
        })
      });
    }
    if (url.includes('/accounts')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { _id: 'acc-1', name: 'Main Account', balance: 5000, type: 'bank' }
        ])
      });
    }
    if (url.includes('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { _id: 'cat-1', name: 'Salary', type: 'income' },
          { _id: 'cat-2', name: 'Food', type: 'expense' }
        ])
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-valid-token');
    localStorage.setItem('auth_user', JSON.stringify({
      _id: 'test-user',
      id: 'test-user',
      name: 'Gemini Test',
      email: 'gemini@gmail.com',
      hasCompletedOnboarding: false
    }));
    localStorage.setItem('finova-lang', 'en');
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const results = [];

  const initialScroll = await page.evaluate(() => ({
    step: 1,
    bodyScrollHeight: document.body.scrollHeight,
    htmlScrollHeight: document.documentElement.scrollHeight,
    windowInnerHeight: window.innerHeight,
    mainScrollHeight: document.querySelector('main')?.scrollHeight,
  }));
  results.push(initialScroll);
  await page.screenshot({ path: 'scripts/onboarding-iphone13-en-screen1.png' });

  for (let i = 2; i <= 10; i++) {
    const nextBtn = page.locator('header button').last();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(i === 3 ? 3000 : 700);
      const stepScroll = await page.evaluate((stepNum) => ({
        step: stepNum,
        bodyScrollHeight: document.body.scrollHeight,
        htmlScrollHeight: document.documentElement.scrollHeight,
        windowInnerHeight: window.innerHeight,
        mainScrollHeight: document.querySelector('main')?.scrollHeight,
      }), i);
      results.push(stepScroll);
      await page.screenshot({ path: `scripts/onboarding-iphone13-en-screen${i}.png` });
    }
  }

  console.log('English Results:', JSON.stringify(results, null, 2));
  await browser.close();
}

inspectEN().catch(err => {
  console.error(err);
  process.exit(1);
});
