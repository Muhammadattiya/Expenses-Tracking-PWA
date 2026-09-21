import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 14'], locale: 'ar' });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');
  await page.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
    cached.hasCompletedOnboarding = false;
    localStorage.setItem('auth_user', JSON.stringify(cached));
  });
  await page.goto('http://localhost:5173/onboarding');
  await page.waitForSelector('main', { timeout: 8000 });
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const main = document.querySelector('main');
    const body = document.body;
    return {
      windowHeight: window.innerHeight,
      mainClientHeight: main.clientHeight,
      mainScrollHeight: main.scrollHeight,
      diff: main.scrollHeight - main.clientHeight,
      bodyClientHeight: body.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      mainComputedHeight: window.getComputedStyle(main).height,
      mainChildren: Array.from(main.children).map(c => ({
        tag: c.tagName,
        class: c.className.slice(0, 50),
        rectHeight: c.getBoundingClientRect().height,
        scrollHeight: c.scrollHeight,
        offsetTop: c.offsetTop
      }))
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
