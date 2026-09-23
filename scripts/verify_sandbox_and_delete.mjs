import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/7046f07c-abac-4102-a0d6-3b9c895409c6/screenshots';

async function run() {
  console.log('--- Starting Playwright Verification ---');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Context
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  // Ensure Arabic RTL
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('Logged in successfully!');

  // Navigate to Debts / Installments tab
  console.log('Navigating to /receivables?tab=installments...');
  await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check if any installment card exists, if not create one to test deletion
  let deleteButtons = await page.$$('button[aria-label="حذف القسط"]');
  if (deleteButtons.length === 0) {
    console.log('No installment found. Creating a test installment first...');
    const addBtn = await page.$('#btn-add-installment') || await page.$('#btn-add-installment-empty');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.fill('input[name="title"]', 'اختبار قسط تجريبي');
      await page.fill('input[name="totalAmount"]', '12000');
      await page.fill('input[name="downPayment"]', '2000');
      await page.fill('input[name="totalMonths"]', '10');
      await page.fill('input[name="monthlyAmount"]', '1000');
      await page.fill('input[name="dueDayOfMonth"]', '15');
      // Submit form
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(2000);
      console.log('Created test installment!');
    }
  }

  // Refresh and locate delete button
  deleteButtons = await page.$$('button[aria-label="حذف القسط"]');
  console.log(`Found ${deleteButtons.length} delete button(s) on installments.`);

  if (deleteButtons.length > 0) {
    console.log('Clicking the delete button on the first installment...');
    await deleteButtons[0].click();
    await page.waitForTimeout(1000);

    // Verify ConfirmModal is visible!
    const modalDialog = await page.$('[role="dialog"]');
    if (modalDialog) {
      console.log('SUCCESS: ConfirmModal is open and visible!');
      // Screenshot the confirm modal
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_06_delete_modal.png') });

      // Click Confirm to delete
      const confirmBtn = await page.$('button:has-text("حذف القسط")');
      if (confirmBtn) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
        console.log('Clicked confirm delete!');
      }
    } else {
      console.error('FAILURE: ConfirmModal did NOT open!');
    }
  }

  // Capture installments list after deletion
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_07_installments_after_delete.png') });

  // 2. Test Sandbox Evaluation & Full Information Completeness
  console.log('Navigating to /sandbox...');
  await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click pre-built template "تجربة الكاش" or run purchase
  const testCashBtn = await page.$('button:has-text("كاش (30 ألف)")');
  if (testCashBtn) {
    console.log('Running Sandbox simulation using template "كاش (30 ألف)"...');
    await testCashBtn.click();
    await page.waitForTimeout(3000);
  }

  // Verify all agreed info is present:
  const content = await page.content();
  const checks = [
    { label: 'Decision Verdict Banner', check: content.includes('نتائج تقييم القرار المالي') || content.includes('خطر مالي حرج') || content.includes('قابل للتطبيق مع الحذر') || content.includes('آمن وموصى به') },
    { label: 'Exact Recovery Quote', check: content.includes('ستحتاج إلى') || content.includes('للتعافي') || content.includes('لا يوجد تعافي تلقائي') },
    { label: 'Emergency Shield Coverage Metric', check: content.includes('تغطية درع الطوارئ') },
    { label: 'DTI Ratio Metric', check: content.includes('نسبة عبء الدين') },
    { label: 'Essential Commitments Burn Metric', check: content.includes('الالتزامات الأساسية الشهرية') },
    { label: 'Simulated Plan Actions Summary', check: content.includes('خطة السيناريو المحاكى') },
    { label: 'Trajectory Chart', check: content.includes('مسار السيولة التوقعي') },
    { label: 'Total Debt & Installments Card', check: content.includes('إجمالي الديون والأقساط') }
  ];

  console.log('--- Sandbox Information Audit Results ---');
  checks.forEach(c => {
    console.log(`[${c.check ? 'PASS' : 'FAIL'}] ${c.label}`);
  });

  // Capture Desktop Evaluation Screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_08_sandbox_complete_result.png'), fullPage: true });

  // 3. Mobile (iPhone 14) Screenshot
  console.log('Testing Mobile iPhone 14 viewport...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14']
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
  await mobilePage.fill('input[type="password"]', '123456789');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });

  await mobilePage.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  const mCashBtn = await mobilePage.$('button:has-text("كاش (30 ألف)")');
  if (mCashBtn) {
    await mCashBtn.click();
    await mobilePage.waitForTimeout(3000);
  }
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_05_sandbox_complete_result.png'), fullPage: true });

  await browser.close();
  console.log('--- Verification Complete ---');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
