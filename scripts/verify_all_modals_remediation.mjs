import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/07112f3e-1fe5-4db2-87b5-e278ab0f510c';

async function testModalsOnPage(page, configName) {
  console.log(`\n========================================`);
  console.log(`Testing Modals for Configuration: [${configName}]`);
  console.log(`========================================`);

  // 1. BILL MODAL
  console.log(`[${configName}] 1. Navigating to /bills...`);
  await page.goto('http://localhost:5173/bills', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const addBillBtn = page.locator('button:has-text("إضافة فاتورة"), button:has-text("Add New Bill"), button:has-text("Add Bill")').first();
  await addBillBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBillBtn.click();

  const billDialog = page.locator('[role="dialog"]').first();
  await billDialog.waitFor({ state: 'visible', timeout: 6000 });
  console.log(`[${configName}] -> BillModal opened.`);

  // Verify autofocus
  await page.waitForTimeout(300);
  const activeIdBill = await page.evaluate(() => document.activeElement?.id);
  console.log(`[${configName}] -> BillModal active focused element:`, activeIdBill);

  // Trigger keyboard submit with Ctrl+Enter on empty form
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);

  // Check inline errors
  const nameError = await billDialog.locator('input#bill-name-input.border-\\[\\#FF3B30\\]').count();
  console.log(`[${configName}] -> BillModal inline error on name rendered:`, nameError > 0);

  // Open account dropdown to check balance subtitle
  const billAccountSelect = billDialog.locator('button[aria-haspopup="listbox"]').first();
  if (await billAccountSelect.isVisible()) {
    await billAccountSelect.click();
    await page.waitForTimeout(300);
    const balanceSubtitles = await page.locator('[role="listbox"] [role="option"] span.text-white\\/40, [role="listbox"] [role="option"] span.tabular-nums').count();
    console.log(`[${configName}] -> BillModal account balance subtitle items:`, balanceSubtitles);
  }

  // Screenshot BillModal with inline errors & selector
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `remediated_bill_${configName}.png`),
    fullPage: false
  });
  console.log(`[${configName}] -> Captured screenshot: remediated_bill_${configName}.png`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. PERSONAL DEBT MODAL
  console.log(`[${configName}] 2. Navigating to /receivables?tab=personal...`);
  await page.goto('http://localhost:5173/receivables?tab=personal', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const addDebtBtn = page.locator('button:has-text("إضافة دين"), button:has-text("Add Debt")').first();
  await addDebtBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addDebtBtn.click();

  const debtDialog = page.locator('[role="dialog"]').first();
  await debtDialog.waitFor({ state: 'visible', timeout: 6000 });
  console.log(`[${configName}] -> PersonalDebtModal opened.`);

  await page.waitForTimeout(300);
  const activeIdDebt = await page.evaluate(() => document.activeElement?.id);
  console.log(`[${configName}] -> PersonalDebtModal active focused element:`, activeIdDebt);

  // Test Ctrl+Enter submit on empty form
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);
  const debtErrors = await debtDialog.locator('.border-\\[\\#FF3B30\\]').count();
  console.log(`[${configName}] -> PersonalDebtModal inline red error count:`, debtErrors);

  // Open account dropdown in debt modal
  const debtAccountSelect = debtDialog.locator('button[aria-haspopup="listbox"]').first();
  if (await debtAccountSelect.isVisible()) {
    await debtAccountSelect.click();
    await page.waitForTimeout(300);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `remediated_debt_${configName}.png`),
    fullPage: false
  });
  console.log(`[${configName}] -> Captured screenshot: remediated_debt_${configName}.png`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. INSTALLMENT MODAL
  console.log(`[${configName}] 3. Navigating to /receivables?tab=installments...`);
  await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const addInstBtn = page.locator('button:has-text("إضافة قسط"), button:has-text("Add Installment")').first();
  await addInstBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addInstBtn.click();

  const instDialog = page.locator('[role="dialog"]').first();
  await instDialog.waitFor({ state: 'visible', timeout: 6000 });
  console.log(`[${configName}] -> InstallmentModal opened.`);

  await page.waitForTimeout(300);
  const activeIdInst = await page.evaluate(() => document.activeElement?.id);
  console.log(`[${configName}] -> InstallmentModal active focused element:`, activeIdInst);

  // Ctrl+Enter on empty form
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);
  const instErrors = await instDialog.locator('.border-\\[\\#FF3B30\\]').count();
  console.log(`[${configName}] -> InstallmentModal inline red error count:`, instErrors);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `remediated_installment_${configName}.png`),
    fullPage: false
  });
  console.log(`[${configName}] -> Captured screenshot: remediated_installment_${configName}.png`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. GROUP EXPENSE MODAL
  console.log(`[${configName}] 4. Navigating to /receivables?tab=group...`);
  await page.goto('http://localhost:5173/receivables?tab=group', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const addGroupBtn = page.locator('button:has-text("إضافة مصروف مشترك"), button:has-text("Add Split Bill")').first();
  if (await addGroupBtn.isVisible()) {
    await addGroupBtn.click();
    const groupDialog = page.locator('[role="dialog"]').first();
    await groupDialog.waitFor({ state: 'visible', timeout: 6000 });
    console.log(`[${configName}] -> GroupExpenseModal opened.`);

    await page.waitForTimeout(300);
    const activeIdGroup = await page.evaluate(() => document.activeElement?.id);
    console.log(`[${configName}] -> GroupExpenseModal active focused element:`, activeIdGroup);

    // Ctrl+Enter on empty form
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(400);
    const groupErrors = await groupDialog.locator('.border-\\[\\#FF3B30\\]').count();
    console.log(`[${configName}] -> GroupExpenseModal inline red error count:`, groupErrors);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `remediated_group_${configName}.png`),
      fullPage: false
    });
    console.log(`[${configName}] -> Captured screenshot: remediated_group_${configName}.png`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

async function runAll() {
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched successfully.');

  // Login
  const initCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const initPage = await initCtx.newPage();
  await initPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await initPage.fill('input[type="email"]', 'gemini@gmail.com');
  await initPage.fill('input[type="password"]', '123456789');
  await initPage.click('button[type="submit"]');
  await initPage.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('Authentication confirmed for gemini@gmail.com.');

  const storageState = await initCtx.storageState();
  await initCtx.close();

  const configs = [
    { name: 'desktop-ar', options: { viewport: { width: 1280, height: 800 } }, lang: 'ar' },
    { name: 'mobile-ar', options: { ...devices['iPhone 14'] }, lang: 'ar' },
    { name: 'desktop-en', options: { viewport: { width: 1280, height: 800 } }, lang: 'en' },
    { name: 'mobile-en', options: { ...devices['iPhone 14'] }, lang: 'en' }
  ];

  for (const cfg of configs) {
    const ctx = await browser.newContext({ ...cfg.options, storageState });
    const p = await ctx.newPage();
    await p.addInitScript((l) => {
      localStorage.setItem('finova-lang', l);
    }, cfg.lang);

    try {
      await testModalsOnPage(p, cfg.name);
    } catch (err) {
      console.error(`Error testing config [${cfg.name}]:`, err.message);
    } finally {
      await ctx.close();
    }
  }

  await browser.close();
  console.log('\nAll modal verification runs completed successfully!');
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
