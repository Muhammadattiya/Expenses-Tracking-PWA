import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function testDedicatedAccountBalance() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  await page.goto('http://localhost:5173/planning?tab=plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Open modal
  const addBtn = page.locator('button:has-text("Add Goal"), button:has-text("هدف جديد")').first();
  await addBtn.click();
  await page.waitForTimeout(1000);

  // Inspect the options in the account select dropdown (the second select on page)
  const selects = await page.$$('select');
  if (selects.length >= 2) {
    const accSelect = selects[1];
    const accountOptions = await accSelect.$$eval('option', opts => opts.map(o => ({ text: o.textContent, val: o.value })));
    console.log('Account Options with Balances:', accountOptions);

    // Select the Bank account which has 40,000 EGP
    const bankOpt = accountOptions.find(o => o.text.includes('Bank') || o.text.includes('40'));
    if (bankOpt) {
      console.log('Selecting Bank Account:', bankOpt.text);
      await accSelect.selectOption(bankOpt.val);
      await page.waitForTimeout(500);

      const syncedAmount = await page.$eval('input[type="number"][readonly]', el => el.value);
      console.log('Synced Amount in input field for Bank:', syncedAmount);
      if (syncedAmount !== '40000') {
        throw new Error(`Expected synced amount to be 40000 but got ${syncedAmount}`);
      }
      console.log('VERIFIED: Goal currentAmount was automatically populated with Bank account balance (40,000 EGP)!');
    }
  }

  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7/goal_modal_account_balances.png' });
  await browser.close();
}

testDedicatedAccountBalance().catch(console.error);
