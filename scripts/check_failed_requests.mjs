import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function check() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', async res => {
    if (res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch {}
      console.log(`❌ FAILED URL [${res.status()}]: ${res.url()} -> ${body.slice(0, 100)}`);
    }
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  await page.waitForTimeout(1500);

  console.log('--- Navigating to /planning?tab=budgets ---');
  await page.goto('http://localhost:5173/planning?tab=budgets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('--- Clicking savings tab ---');
  await page.click('#planning-tab-savings');
  await page.waitForTimeout(2000);

  console.log('--- Clicking emergency tab ---');
  await page.click('#planning-tab-emergency');
  await page.waitForTimeout(2000);

  console.log('--- Clicking plans tab ---');
  await page.click('#planning-tab-plans');
  await page.waitForTimeout(2000);

  await browser.close();
}

check();
