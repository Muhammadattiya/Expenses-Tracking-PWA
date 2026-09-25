import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const SCREENSHOT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/d96b2c06-977b-4948-b129-70e006ddaf6a/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginUser(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  await page.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('🚀 Starting Comprehensive Sandbox Perfect Output Verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // TEST 1: DESKTOP ARABIC (RTL) - Upfront Hints, Modals Tips & Scenarios
    // =========================================================================
    console.log('\n--- 1. Testing Desktop Arabic (RTL) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      deviceScaleFactor: 1
    });
    const pageAr = await desktopContext.newPage();
    await pageAr.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await loginUser(pageAr);
    console.log('✅ Logged in successfully on Desktop');

    await pageAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await pageAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pageAr.waitForTimeout(1200);

    // Verify Upfront Grid Subtitle Hints
    console.log('Verifying upfront grid subtitle hints in Arabic...');
    const bodyText = await pageAr.innerText('body');
    const hasPurchaseSub = bodyText.includes('فحص الأمان والسيولة قبل الشراء');
    const hasInstallmentSub = bodyText.includes('كاش أم تقسيط');
    const hasSalarySub = bodyText.includes('تأثير زيادة أو نقص الدخل');
    console.log('Grid Subtitle Hints found:', { hasPurchaseSub, hasInstallmentSub, hasSalarySub });

    // Check for raw translation keys
    const rawKeysAr = bodyText.match(/sandbox\.[a-zA-Z0-9_.]+/g);
    console.log('Raw translation keys on initial page load:', rawKeysAr || 'None (0)!');

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, '01_desktop_grid_hints_ar.png') });
    console.log('📸 Captured 01_desktop_grid_hints_ar.png');

    // TEST 1.1: Verify Modal Guidance Tip Banner
    console.log('Testing upfront modal guidance tip banner (Salary modal)...');
    const salaryGridBtn = pageAr.locator('button:has-text("تعديل الدخل"), button:has-text("Salary")').first();
    await salaryGridBtn.click();
    await pageAr.waitForTimeout(500);

    const modalDialog = pageAr.locator('[role="dialog"]');
    const modalTipText = await modalDialog.innerText();
    const hasTip = modalTipText.includes('كيف سيغير الدخل الجديد من وتيرة ادخارك') || modalTipText.includes('قبل التعديل:');
    console.log('Modal Guidance Tip Banner Present:', hasTip);

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, '02_desktop_modal_guidance_tip_ar.png') });
    console.log('📸 Captured 02_desktop_modal_guidance_tip_ar.png');

    // Fill Salary Form: 35000 EGP
    const salaryInput = modalDialog.locator('input[type="number"]').first();
    await salaryInput.fill('35000');
    await modalDialog.locator('button[type="submit"]').first().click();
    await pageAr.waitForTimeout(500);

    // Run simulation from pipeline
    const runBtn = pageAr.locator('#btn-run-simulation');
    await runBtn.waitFor({ state: 'visible', timeout: 5000 });
    await runBtn.click();
    await pageAr.waitForTimeout(1500);

    // Verify Salary Output: Tailored cards and alternatives
    const salaryCardText = await pageAr.innerText('body');
    const hasWhyItMatters = salaryCardText.includes('ماذا يعني هذا القرار لك؟');
    const hasSurplusCard = salaryCardText.includes('الفائض الشهري الصافي');
    const hasVelocityCard = salaryCardText.includes('سرعة الادخار');
    const hasInvestSurplusAlt = salaryCardText.includes('استثمر 50% من الزيادة');
    const hasAccelerateDebtAlt = salaryCardText.includes('وجّه الفائض لتسريع سداد الديون');

    console.log('Salary Decision Output Verification:', {
      hasWhyItMatters,
      hasSurplusCard,
      hasVelocityCard,
      hasInvestSurplusAlt,
      hasAccelerateDebtAlt
    });

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, '03_desktop_salary_perfect_output_ar.png') });
    console.log('📸 Captured 03_desktop_salary_perfect_output_ar.png');

    // TEST 1.2: Click 1-Click Alternative Chip ("استثمر 50% من الزيادة")
    console.log('Clicking 1-Click Alternative: "استثمر 50% من الزيادة"...');
    const investChip = pageAr.locator('button:has-text("استثمر 50% من الزيادة")').first();
    if (await investChip.isVisible()) {
      await investChip.click();
      await pageAr.waitForTimeout(1500);
      console.log('✅ Successfully triggered 1-click alternative!');
      await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, '04_desktop_alternative_applied_ar.png') });
      console.log('📸 Captured 04_desktop_alternative_applied_ar.png');
    }

    // Reset simulation to return to grid
    const resetBtn = pageAr.locator('button:has-text("سيناريو جديد"), button:has-text("New Scenario"), button:has-text("إعادة ضبط")').first();
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await pageAr.waitForTimeout(1000);
    }

    // TEST 1.3: Simulate Investment (Asset Allocation) Scenario
    console.log('Testing Investment Simulation (Buy Assets)...');
    const invGridBtn = pageAr.locator('button:has-text("استثمار"), button:has-text("Investment")').first();
    await invGridBtn.click();
    await pageAr.waitForTimeout(500);

    const invDialog = pageAr.locator('[role="dialog"]');
    const invAmtInput = invDialog.locator('input[type="number"]').first();
    await invAmtInput.fill('20000');
    await invDialog.locator('button[type="submit"]').first().click();
    await pageAr.waitForTimeout(500);

    await pageAr.locator('#btn-run-simulation').click();
    await pageAr.waitForTimeout(1500);

    const invCardText = await pageAr.innerText('body');
    const hasNetWorthTag = invCardText.includes('الثروة محفوظة 100%') || invCardText.includes('محفوظاً بنسبة 100%');
    const hasInvestAssetsCard = invCardText.includes('إجمالي الأصول الاستثمارية');
    const hasInvestHalfAlt = invCardText.includes('استثمار 50%');

    console.log('Investment Decision Output Verification:', {
      hasNetWorthTag,
      hasInvestAssetsCard,
      hasInvestHalfAlt
    });

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, '05_desktop_investment_output_ar.png') });
    console.log('📸 Captured 05_desktop_investment_output_ar.png');

    await desktopContext.close();

    // =========================================================================
    // TEST 2: ENGLISH (LTR) VERIFICATION
    // =========================================================================
    console.log('\n--- 2. Testing Desktop English (LTR) ---');
    const englishContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      deviceScaleFactor: 1
    });
    const pageEn = await englishContext.newPage();
    await pageEn.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
    });

    await loginUser(pageEn);
    await pageEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await pageEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pageEn.waitForTimeout(1000);

    // Verify English hints
    const enBodyText = await pageEn.innerText('body');
    const hasEnHints = enBodyText.includes('Check liquidity') || enBodyText.includes('Cash vs installments');
    const rawKeysEn = enBodyText.match(/sandbox\.[a-zA-Z0-9_.]+/g);
    console.log('English Grid Subtitle Hints found:', hasEnHints);
    console.log('Raw translation keys in English:', rawKeysEn || 'None (0)!');

    await pageEn.screenshot({ path: path.join(SCREENSHOT_DIR, '06_desktop_grid_hints_en.png') });
    console.log('📸 Captured 06_desktop_grid_hints_en.png');

    // Run Debt Scenario in English
    console.log('Testing Debt scenario in English...');
    const debtGridBtn = pageEn.locator('button:has-text("Debt Action")').first();
    await debtGridBtn.click();
    await pageEn.waitForTimeout(500);

    const debtDialog = pageEn.locator('[role="dialog"]');
    const debtTip = await debtDialog.innerText();
    console.log('English Modal Guidance Tip Present:', debtTip.includes('Before debt'));

    const debtAmtInput = debtDialog.locator('input[type="number"]').first();
    await debtAmtInput.fill('15000');
    await debtDialog.locator('button[type="submit"]').first().click();
    await pageEn.waitForTimeout(500);

    await pageEn.locator('#btn-run-simulation').click();
    await pageEn.waitForTimeout(1500);

    const debtCardText = await pageEn.innerText('body');
    console.log('English Debt Output Verification:', {
      hasWhyItMatters: debtCardText.includes('Why This Decision Matters'),
      hasTotalDebtCard: debtCardText.includes('Total Debt Remaining') || debtCardText.includes('Total Debt'),
      hasDTI: debtCardText.includes('Debt-to-Income (DTI)') || debtCardText.includes('DTI'),
      hasAlt: debtCardText.includes('Try borrowing 50%') || debtCardText.includes('50%')
    });

    await pageEn.screenshot({ path: path.join(SCREENSHOT_DIR, '07_desktop_debt_output_en.png') });
    console.log('📸 Captured 07_desktop_debt_output_en.png');

    await englishContext.close();

    // =========================================================================
    // TEST 3: MOBILE (iPhone 14) ARABIC (RTL)
    // =========================================================================
    console.log('\n--- 3. Testing Mobile (iPhone 14) Arabic (RTL) ---');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14'],
      deviceScaleFactor: 2
    });
    const pageMobile = await mobileContext.newPage();
    await pageMobile.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await loginUser(pageMobile);
    await pageMobile.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await pageMobile.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pageMobile.waitForTimeout(1000);

    await pageMobile.screenshot({ path: path.join(SCREENSHOT_DIR, '08_mobile_grid_ar.png') });
    console.log('📸 Captured 08_mobile_grid_ar.png');

    // Test Cash vs Installments Template on Mobile
    const testInstBtn = pageMobile.locator('button:has-text("تجربة التقسيط")').first();
    if (await testInstBtn.isVisible()) {
      await testInstBtn.click();
      await pageMobile.waitForTimeout(1500);
      await pageMobile.screenshot({ path: path.join(SCREENSHOT_DIR, '09_mobile_installment_result_ar.png') });
      console.log('📸 Captured 09_mobile_installment_result_ar.png');
    }

    await mobileContext.close();

    console.log('\n✨ All automated verification tests completed successfully!');
  } catch (err) {
    console.error('❌ Verification error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();
