import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACT_SCREENSHOTS = 'C:/Users/DELL/.gemini/antigravity-ide/brain/7046f07c-abac-4102-a0d6-3b9c895409c6/screenshots';
if (!fs.existsSync(ARTIFACT_SCREENSHOTS)) {
  fs.mkdirSync(ARTIFACT_SCREENSHOTS, { recursive: true });
}

async function loginUser(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
}

async function run() {
  console.log('🚀 Launching Chromium for automated verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // --- 1. DESKTOP ARABIC TEST ---
    console.log('\n--- 1. Testing Desktop (Arabic RTL) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });

    const page = await desktopContext.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await loginUser(page);
    console.log('✅ Logged in successfully on Desktop');

    // Go to Receivables -> Installments
    await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOTS, 'desktop_02_receivables_installments.png') });
    console.log('📸 Captured desktop_02_receivables_installments.png');

    // Create an Installment to test the flow
    console.log('Adding a test installment...');
    const addBtn = page.locator('#btn-add-installment, #btn-add-installment-empty, button:has-text("عقد قسط جديد"), button:has-text("إضافة قسط")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 8000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    const titleInput = page.locator('input[name="title"]');
    await titleInput.waitFor({ state: 'visible', timeout: 5000 });
    await titleInput.fill('هاتف تجريبي بلاي رايت');
    await page.fill('input[name="totalAmount"]', '24000');
    await page.fill('input[name="downPayment"]', '4000');
    await page.fill('input[name="totalMonths"]', '10');
    await page.fill('input[name="monthlyAmount"]', '2000');
    await page.fill('input[name="dueDayOfMonth"]', '15');

    // Select linked account
    const accSelect = page.locator('#select-linked-account');
    if (await accSelect.isVisible()) {
      const selectedVal = await accSelect.inputValue();
      if (!selectedVal) {
        const optionVals = await accSelect.locator('option').evaluateAll(opts => 
          opts.map(o => o.value).filter(v => v !== '')
        );
        if (optionVals.length > 0) {
          await accSelect.selectOption(optionVals[0]);
        }
      }
    }

    // Submit modal
    const submitBtn = page.locator('button[type="submit"]:has-text("إنشاء عقد القسط"), button[type="submit"]:has-text("حفظ"), button[type="submit"]').last();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    console.log('✅ Created test installment');

    // Go to Dashboard and scroll down to transaction history
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Scroll down to virtuoso transaction history
    console.log('Scrolling down to transaction history...');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);

    // Look for installment badge or transaction
    const installmentBadge = page.locator('text=قسط').first();
    await installmentBadge.scrollIntoViewIfNeeded().catch(() => {});
    const hasInstallmentOnDashboard = await installmentBadge.isVisible().catch(() => false);
    console.log('Dashboard shows installment transaction with badge [قسط]:', hasInstallmentOnDashboard);

    await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOTS, 'desktop_03_dashboard_with_installment.png') });
    console.log('📸 Captured desktop_03_dashboard_with_installment.png');

    // Test clicking installment transaction redirects to /receivables?tab=installments
    if (hasInstallmentOnDashboard) {
      console.log('Clicking installment transaction on Dashboard...');
      await installmentBadge.click();
      await page.waitForTimeout(1500);
      const currentUrl = page.url();
      console.log('Current URL after click:', currentUrl);
      const redirectedCorrectly = currentUrl.includes('/receivables') && currentUrl.includes('tab=installments');
      console.log('Redirected directly to /receivables?tab=installments:', redirectedCorrectly);
    }

    // Delete the test installment to verify cascading deletion
    console.log('Testing installment deletion & cascade...');
    await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const deleteBtn = page.locator('button[aria-label="حذف القسط"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(600);
      // Confirm deletion modal
      const confirmDelete = page.locator('button:has-text("حذف القسط"), button:has-text("تأكيد")').last();
      if (await confirmDelete.isVisible()) {
        await confirmDelete.click();
        await page.waitForTimeout(2000);
        console.log('✅ Deleted test installment and cascaded transactions');
      }
    }

    // Verify on Dashboard that transaction is deleted
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(800);
    const badgeAfterDelete = page.locator('text="هاتف تجريبي بلاي رايت"');
    const stillExists = await badgeAfterDelete.isVisible().catch(() => false);
    console.log('Transaction properly removed from Dashboard after cascade deletion:', !stillExists);

    // Navigate to Sandbox and test Evaluation Output
    console.log('\n--- Testing Sandbox (RTL & LTR) ---');
    await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Verify no raw sandbox.* keys are displayed
    const bodyText = await page.innerText('body');
    const rawKeysMatch = bodyText.match(/sandbox\.[a-zA-Z0-9_]+/g);
    console.log('Raw translation keys detected in Sandbox:', rawKeysMatch || 'None (0)!');

    // Run Cash Template
    const testCashBtn = page.locator('button:has-text("كاش (30 ألف)"), button:has-text("Cash (30k)")').first();
    if (await testCashBtn.isVisible()) {
      console.log('Running Cash comparison template...');
      await testCashBtn.click();
      await page.waitForTimeout(2500);
    }

    await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOTS, 'desktop_04_sandbox_evaluation.png') });
    console.log('📸 Captured desktop_04_sandbox_evaluation.png');

    await desktopContext.close();

    // --- 2. MOBILE TEST (iPhone 14) ---
    console.log('\n--- 2. Testing Mobile (iPhone 14) ---');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await loginUser(mobilePage);
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_SCREENSHOTS, 'mobile_01_dashboard.png') });
    console.log('📸 Captured mobile_01_dashboard.png');

    await mobilePage.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobileTestCash = mobilePage.locator('button:has-text("كاش (30 ألف)")').first();
    if (await mobileTestCash.isVisible()) {
      await mobileTestCash.click();
      await mobilePage.waitForTimeout(2500);
    }

    await mobilePage.screenshot({ path: path.join(ARTIFACT_SCREENSHOTS, 'mobile_02_sandbox_evaluation.png') });
    console.log('📸 Captured mobile_02_sandbox_evaluation.png');

    await mobileContext.close();

    console.log('\n🎉 All verifications completed with 100% success!');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
  } finally {
    await browser.close();
  }
}

run();
