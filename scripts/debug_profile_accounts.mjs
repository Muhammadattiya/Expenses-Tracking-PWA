import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  // Go to /profile where AccountManagement shows all accounts and their exact balances
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const accs = await page.evaluate(() => {
    // In AccountManagement: accounts list has names and balances
    const rows = Array.from(document.querySelectorAll('.font-bold.text-white.text-sm'));
    return rows.map(r => {
      const container = r.closest('div.flex.items-center.justify-between') || r.parentElement?.parentElement;
      return container ? container.innerText.replace(/\n+/g, ' | ') : r.innerText;
    });
  });
  console.log('[DEBUG] AccountManagement account cards:', accs);

  await browser.close();
}

run();
