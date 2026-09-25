import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // Test Arabic RTL
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 8000 });
  console.log('Logged in successfully!');

  console.log('Navigating to /sandbox...');
  await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on "شراء كاش" (Purchase scenario button)
  const purchaseBtn = page.locator('button:has-text("شراء كاش"), button:has-text("Purchase")').first();
  await purchaseBtn.click();
  await page.waitForTimeout(500);

  // Fill in amount: 5000
  await page.fill('#sim-purchase-amount', '5000');

  // Verify custom select shows options with balance
  const selectBtn = page.locator('[role="dialog"] button').filter({ hasText: /Bank|cash|Wallet|اختر الحساب/i }).first();
  await selectBtn.click();
  await page.waitForTimeout(300);

  // Take screenshot of modal with accounts dropdown
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092/modal_accounts_dropdown.png' });
  console.log('Saved modal_accounts_dropdown.png');

  // Click on Bank option
  const bankOption = page.locator('[role="listbox"] [role="option"], div[role="dialog"] div').filter({ hasText: /Bank/i }).first();
  await bankOption.click();
  await page.waitForTimeout(300);

  // Submit modal form
  const submitBtn = page.locator('[role="dialog"] button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(500);

  // Click Run simulation button
  const runBtn = page.locator('#btn-run-simulation');
  await runBtn.click();
  await page.waitForTimeout(2000);

  // Verify results view has Bank badge
  const resultsCard = page.locator('text=Bank').first();
  const bankVisible = await resultsCard.isVisible();
  console.log('Is "Bank" visible in results card?:', bankVisible);

  // Verify Verdict text does NOT mention cash
  const pageContent = await page.content();
  const mentionsCashOverdraft = pageContent.includes('الحساب المحدد للعملية (cash)');
  console.log('Mentions "الحساب المحدد للعملية (cash)"?:', mentionsCashOverdraft);

  // Take full results screenshot
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092/sandbox_account_fix_verified.png', fullPage: true });
  console.log('Saved sandbox_account_fix_verified.png');

  await browser.close();
  
  if (mentionsCashOverdraft) {
    throw new Error('FAILED: Still mentions cash as the funding account!');
  }
  if (!bankVisible) {
    throw new Error('FAILED: Bank account badge was not visible in simulated plan!');
  }
  console.log('ALL VERIFICATIONS PASSED 100%!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
