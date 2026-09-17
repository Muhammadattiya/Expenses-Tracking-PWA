import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/receivables');
  await page.waitForTimeout(1500);
  console.log('Clicking tab-personal...');
  await page.click('#tab-personal');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/test_tab_personal.png' });
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log('Content snippet:', content.substring(0, 300));
  await browser.close();
}

test().catch(console.error);
