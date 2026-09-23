import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');

  await page.goto('http://localhost:5173/planning?tab=emergency', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const el = document.getElementById('panel-emergency');
    return {
      text: el ? el.innerText : 'NOT FOUND',
      htmlLength: el ? el.innerHTML.length : 0,
      hasPulse: el ? !!el.querySelector('.animate-pulse') : false
    };
  });

  console.log('SHIELD DOM DATA:\n', data.text);
  console.log('hasPulse:', data.hasPulse, 'htmlLength:', data.htmlLength);

  await page.screenshot({ path: 'scripts/shield_full_inspect.png', fullPage: true });

  await browser.close();
}

inspect();
