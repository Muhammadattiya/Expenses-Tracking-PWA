import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  console.log('Navigating to /planning?tab=plans...');
  await page.goto('http://localhost:5173/planning?tab=plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const html = await page.$eval('#panel-plans', el => el.innerHTML).catch(() => 'NOT FOUND');
  console.log('Panel HTML length:', html.length);
  if (html.includes('animate-pulse')) {
    console.log('STILL IN ANIMATE-PULSE!');
  } else {
    console.log('RENDERED CONTENT SUCCESSFULLY!');
  }

  await browser.close();
}

test();
