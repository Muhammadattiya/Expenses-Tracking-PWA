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

  // Login
  console.log('[DEBUG] Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  // 1. Check Dashboard account balances
  console.log('[DEBUG] Checking Dashboard account balances...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const dashboardInfo = await page.evaluate(() => {
    // Total balance
    const heroText = document.body.innerText;
    return {
      title: document.title,
      textSample: heroText.substring(0, 500)
    };
  });
  console.log('[DEBUG] Dashboard info:', dashboardInfo);

  // 2. Open /planning?tab=plans and open New Goal modal
  console.log('[DEBUG] Navigating to /planning?tab=plans...');
  await page.goto('http://localhost:5173/planning?tab=plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click "+ New Goal" button
  const newGoalBtn = await page.locator('button:has-text("New Goal")');
  await newGoalBtn.click();
  await page.waitForTimeout(1000);

  // Inspect the accounts select options inside the GoalModal (2nd select)
  const goalModalOptions = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    const accSelect = selects[1] || selects[0];
    return Array.from(accSelect.options).map(opt => ({
      value: opt.value,
      text: opt.text
    }));
  });
  console.log('[DEBUG] Account Select Options in GoalModal:', goalModalOptions);

  // Inspect current amount input value
  const currentAmountVal = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    return inputs.map(i => ({ placeholder: i.placeholder, value: i.value, readOnly: i.readOnly }));
  });
  console.log('[DEBUG] GoalModal Number Inputs:', currentAmountVal);

  await browser.close();
}

run();
