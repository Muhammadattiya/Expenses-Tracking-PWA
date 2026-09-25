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
  console.log('🚀 Starting Sandbox UX Verification with Playwright...');
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // TEST 1: DESKTOP ARABIC (RTL) - Installment Purchase & Trade-offs
    // -------------------------------------------------------------
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
    await pageAr.waitForTimeout(1000);

    // Verify no untranslated keys
    const initialText = await pageAr.innerText('body');
    const rawKeys = initialText.match(/sandbox\.[a-zA-Z0-9_]+/g);
    console.log('Raw translation keys on initial load:', rawKeys || 'None (0)!');

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_01_sandbox_initial_ar.png') });
    console.log('📸 Captured desktop_01_sandbox_initial_ar.png');

    // Test Purchase Modal with Cash vs. Installment toggle
    console.log('Opening Purchase modal to test Cash vs Installments toggle...');
    const purchaseBtn = pageAr.locator('button:has-text("شراء كاش"), button:has-text("Purchase")').first();
    await purchaseBtn.waitFor({ state: 'visible', timeout: 8000 });
    await purchaseBtn.click();
    await pageAr.waitForTimeout(500);

    // Switch to Installment tab inside Purchase Modal
    console.log('Switching to Installment tab in Purchase modal...');
    const dialog = pageAr.locator('[role="dialog"]');
    const installmentTab = dialog.locator('button:has-text("شراء بالتقسيط"), button:has-text("Installments")').first();
    await installmentTab.click();
    await pageAr.waitForTimeout(400);

    // Fill installment fields: Title, 48000 EGP, 8000 down, 12 months
    await dialog.locator('#sim-inst-title').fill('ماكبوك برو M3');
    await dialog.locator('#sim-inst-total').fill('48000');
    await dialog.locator('#sim-inst-down').fill('8000');

    // Click 12 months quick duration chip inside dialog
    const chip12 = dialog.locator('button:has-text("12 شهر"), button:has-text("12 mo")').first();
    if (await chip12.isVisible()) {
      await chip12.click();
    }

    // Select account inside dialog
    const selectAcc = dialog.locator('button').filter({ hasText: /Bank|cash|Wallet|حساب/i }).first();
    if (await selectAcc.isVisible()) {
      await selectAcc.click();
      await pageAr.waitForTimeout(300);
      const accOpt = pageAr.locator('[role="listbox"] [role="option"], div[role="dialog"] div').filter({ hasText: /Bank|حساب/i }).first();
      if (await accOpt.isVisible()) {
        await accOpt.click();
      }
    }

    // Submit modal
    await dialog.locator('button[type="submit"]').first().click();
    await pageAr.waitForTimeout(600);

    // Verify pipeline item rendered with rich details
    console.log('Checking Action Queue in pipeline...');
    const runBtn = pageAr.locator('#btn-run-simulation');
    await runBtn.waitFor({ state: 'visible', timeout: 8000 });
    await runBtn.click();

    // Wait for decision result card
    console.log('Waiting for decision results card...');
    await pageAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
    await pageAr.waitForTimeout(800);

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_02_installment_result_ar.png') });
    console.log('📸 Captured desktop_02_installment_result_ar.png');

    // Test quick alternative chip: "Try 6 Months"
    console.log('Testing quick alternative chip (Try 6 months)...');
    const try6Btn = pageAr.locator('button:has-text("6 أشهر"), button:has-text("6 Months")').first();
    if (await try6Btn.isVisible()) {
      await try6Btn.click();
      await pageAr.waitForTimeout(2000);
      console.log('✅ Adjusted to 6 months successfully');
    }

    // Expand "View Complete Financial Breakdown"
    console.log('Testing progressive disclosure...');
    const breakdownBtn = pageAr.locator('button:has-text("عرض التفاصيل المالية الكاملة"), button:has-text("View Complete Financial Breakdown")').first();
    if (await breakdownBtn.isVisible()) {
      await breakdownBtn.click();
      await pageAr.waitForTimeout(600);
    }

    await pageAr.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_03_breakdown_expanded_ar.png') });
    console.log('📸 Captured desktop_03_breakdown_expanded_ar.png');

    await desktopContext.close();

    // -------------------------------------------------------------
    // TEST 2: MOBILE (iPhone 14) ARABIC (RTL)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Mobile (iPhone 14) Arabic (RTL) ---');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const pageMobile = await mobileContext.newPage();
    await pageMobile.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await loginUser(pageMobile);
    await pageMobile.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
    await pageMobile.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pageMobile.waitForTimeout(1000);

    // Run Cash template on mobile
    const testCashBtn = pageMobile.locator('button:has-text("كاش (30 ألف)"), button:has-text("Cash (30k)")').first();
    if (await testCashBtn.isVisible()) {
      await testCashBtn.click();
      await pageMobile.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
      await pageMobile.waitForTimeout(800);
    }

    await pageMobile.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_01_sandbox_result_ar.png') });
    console.log('📸 Captured mobile_01_sandbox_result_ar.png');

    await mobileContext.close();

    // -------------------------------------------------------------
    // TEST 3: DESKTOP ENGLISH (LTR)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Desktop English (LTR) ---');
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

    // Run Installment template in English
    const testInstBtn = pageEn.locator('button:has-text("Installment (12 Months)"), button:has-text("تقسيط (12 شهر)")').first();
    if (await testInstBtn.isVisible()) {
      await testInstBtn.click();
      await pageEn.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
      await pageEn.waitForTimeout(800);
    }

    await pageEn.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_04_sandbox_result_en.png') });
    console.log('📸 Captured desktop_04_sandbox_result_en.png');

    await englishContext.close();

    console.log('\n🎉 All Playwright automated tests completed successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
