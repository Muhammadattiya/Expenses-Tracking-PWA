import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/7046f07c-abac-4102-a0d6-3b9c895409c6/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'gemini@gmail.com',
  password: '123456789'
};

async function loginUser(page) {
  console.log('Logging in user:', CREDENTIALS.email);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', CREDENTIALS.email);
  await page.fill('input[type="password"]', CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  if (page.url().includes('/onboarding')) {
    console.log('Skipping onboarding...');
    const skipBtn = page.locator('button:has-text("تخطي"), a:has-text("تخطي")').first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  } else {
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  }
  console.log('Successfully logged in and reached Dashboard!');
}

async function runDesktopSuite(browser) {
  console.log('\n--- STARTING DESKTOP SUITE (Arabic RTL, 1280x800) ---');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      console.log('API RESPONSE:', res.status(), res.url());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  // 1. Authenticate
  await loginUser(page);

  // 2. Dashboard - Financial Shield Widget Check
  console.log('1. Checking Dashboard Financial Shield Widget...');
  await page.waitForSelector('text=درع الأمان المالي', { timeout: 8000 });
  await page.waitForTimeout(1000); // Allow gauge animation to settle
  const dashPath = path.join(SCREENSHOT_DIR, 'desktop_01_dashboard_shield.png');
  await page.screenshot({ path: dashPath, fullPage: false });
  console.log('Saved screenshot:', dashPath);

  // 3. User Story 1: Receivables -> Installments Tab
  console.log('2. Checking Receivables & Installments Tab...');
  await page.goto(`${BASE_URL}/receivables`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#tab-installments', { timeout: 8000 });
  await page.click('#tab-installments');
  await page.waitForTimeout(800); // Wait for tab slide animation
  const instPath = path.join(SCREENSHOT_DIR, 'desktop_02_installments.png');
  await page.screenshot({ path: instPath, fullPage: false });
  console.log('Saved screenshot:', instPath);

  // 4. User Story 3: Profile -> Accounts Management & Savings Goals Tab
  console.log('3. Checking Profile & Smart Savings Goals Tab...');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-profile-accounts', { timeout: 8000 });
  await page.click('#btn-profile-accounts');
  await page.waitForSelector('#tab-section-savings', { timeout: 8000 });
  await page.click('#tab-section-savings');
  await page.waitForTimeout(800);
  const goalsPath = path.join(SCREENSHOT_DIR, 'desktop_03_savings_goals.png');
  await page.screenshot({ path: goalsPath, fullPage: false });
  console.log('Saved screenshot:', goalsPath);

  // 5. User Story 4: Sandbox Trajectory Simulation
  console.log('4. Checking Financial Sandbox Multi-Month Simulation...');
  await page.goto(`${BASE_URL}/sandbox`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=مقارنة الشراء كاش مقابل التقسيط', { timeout: 8000 });
  await page.waitForTimeout(1000);

  // Click pre-built Installment template button which automatically runs the simulation
  const instTemplateBtn = page.locator('button:has-text("تقسيط (12 شهر)")');
  await instTemplateBtn.click();
  console.log('Selected Installment template and running simulation...');

  // Wait for evaluation results to appear
  await page.waitForSelector('text=نتائج تقييم القرار المالي', { timeout: 12000 });
  await page.waitForSelector('#btn-commit-reality', { timeout: 8000 });
  await page.waitForTimeout(1000); // Allow Recharts area animation to finish

  const simPath = path.join(SCREENSHOT_DIR, 'desktop_04_sandbox_evaluation.png');
  await page.screenshot({ path: simPath, fullPage: false });
  console.log('Saved screenshot:', simPath);

  // 6. User Story 5: Commit to Reality Modal
  console.log('5. Checking Commit to Reality Bridge...');
  await page.click('#btn-commit-reality');

  await page.waitForSelector('#btn-confirm-commit', { timeout: 8000 });
  await page.waitForTimeout(600); // Modal entrance transition
  const commitPath = path.join(SCREENSHOT_DIR, 'desktop_05_commit_modal.png');
  await page.screenshot({ path: commitPath, fullPage: false });
  console.log('Saved screenshot:', commitPath);

  // Close the modal cleanly
  await page.click('button:has-text("إلغاء")');
  await page.waitForTimeout(400);

  await context.close();
  console.log('--- DESKTOP SUITE PASSED ---');
}

async function runMobileSuite(browser) {
  console.log('\n--- STARTING MOBILE SUITE (iPhone 14, Arabic RTL) ---');
  const context = await browser.newContext({
    ...devices['iPhone 14']
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  // 1. Authenticate
  await loginUser(page);

  // 2. Mobile Dashboard with Shield Widget
  console.log('1. Checking Mobile Dashboard Shield Widget...');
  await page.waitForSelector('text=درع الأمان المالي', { timeout: 8000 });
  await page.waitForTimeout(1000);
  const mobileDashPath = path.join(SCREENSHOT_DIR, 'mobile_01_dashboard_shield.png');
  await page.screenshot({ path: mobileDashPath, fullPage: false });
  console.log('Saved screenshot:', mobileDashPath);

  // 3. Mobile Installments Tab
  console.log('2. Checking Mobile Installments Tab...');
  await page.goto(`${BASE_URL}/receivables`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#tab-installments', { timeout: 8000 });
  await page.click('#tab-installments');
  await page.waitForTimeout(800);
  const mobileInstPath = path.join(SCREENSHOT_DIR, 'mobile_02_installments.png');
  await page.screenshot({ path: mobileInstPath, fullPage: false });
  console.log('Saved screenshot:', mobileInstPath);

  // 4. Mobile Savings Goals Tab
  console.log('3. Checking Mobile Savings Goals Tab...');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-profile-accounts', { timeout: 8000 });
  await page.click('#btn-profile-accounts');
  await page.waitForSelector('#tab-section-savings', { timeout: 8000 });
  await page.click('#tab-section-savings');
  await page.waitForTimeout(800);
  const mobileGoalsPath = path.join(SCREENSHOT_DIR, 'mobile_03_savings_goals.png');
  await page.screenshot({ path: mobileGoalsPath, fullPage: false });
  console.log('Saved screenshot:', mobileGoalsPath);

  // 5. Mobile Sandbox Simulation
  console.log('4. Checking Mobile Sandbox Trajectory Simulation...');
  await page.goto(`${BASE_URL}/sandbox`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=مقارنة الشراء كاش مقابل التقسيط', { timeout: 8000 });

  const instTemplateBtn = page.locator('button:has-text("تقسيط (12 شهر)")');
  await instTemplateBtn.click();

  await page.waitForSelector('text=نتائج تقييم القرار المالي', { timeout: 12000 });
  await page.waitForSelector('#btn-commit-reality', { timeout: 8000 });
  await page.waitForTimeout(1000);

  const mobileSimPath = path.join(SCREENSHOT_DIR, 'mobile_04_sandbox_trajectory.png');
  await page.screenshot({ path: mobileSimPath, fullPage: false });
  console.log('Saved screenshot:', mobileSimPath);

  await context.close();
  console.log('--- MOBILE SUITE PASSED ---');
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    await runDesktopSuite(browser);
    await runMobileSuite(browser);
    console.log('\n===========================================');
    console.log('🎉 ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
    console.log('===========================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
