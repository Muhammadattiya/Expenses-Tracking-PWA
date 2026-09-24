import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function test() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await page.addInitScript(() => { localStorage.setItem('finova-lang', 'ar'); });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
  await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 10000 });
  await page.evaluate(() => window.scrollBy(0, 450));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/audit_mobile_scrolled.png' });
  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
