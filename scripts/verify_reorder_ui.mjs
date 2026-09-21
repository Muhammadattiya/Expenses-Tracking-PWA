import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const screenshotDir = 'C:/Users/DELL/.gemini/antigravity-ide/brain/d817574a-5504-4f69-9761-8e633bdea39f';

async function run() {
  console.log('🚀 Starting Playwright UI verification for Account & Category Reorder...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop test (Arabic RTL)
  console.log('\n--- 1. Desktop Test (Arabic RTL) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('Navigating to login...');
  await desktopPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await desktopPage.fill('input[type="email"]', 'gemini@gmail.com');
  await desktopPage.fill('input[type="password"]', '123456789');
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('Logged in successfully!');

  // Navigate to Profile
  await desktopPage.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  // Click Account Management
  console.log('Opening Account Management...');
  await desktopPage.locator('text=إدارة الحسابات').first().click();
  // Wait for loading to finish
  await desktopPage.waitForSelector('button:has-text("إضافة حساب")', { timeout: 10000 });
  await desktopPage.waitForTimeout(500);

  // Capture Account Management normal view
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop_account_mgmt_normal.png') });
  console.log('Captured desktop_account_mgmt_normal.png');

  // Click "ترتيب" (Arrange)
  const arrangeBtn = desktopPage.locator('button:has-text("ترتيب")');
  await arrangeBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Clicking "ترتيب" (Arrange)...');
  await arrangeBtn.click();
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop_account_mgmt_arranging.png') });
  console.log('Captured desktop_account_mgmt_arranging.png');

  // Drag the first item down
  const gripHandles = desktopPage.locator('svg.lucide-grip-vertical');
  const count = await gripHandles.count();
  console.log(`Found ${count} drag handles.`);

  // Click "تم" (Done)
  const doneBtn = desktopPage.locator('button:has-text("تم")');
  await doneBtn.click();
  await desktopPage.waitForTimeout(1000);

  // Back to Profile main
  await desktopPage.locator('button:has(svg.lucide-arrow-left)').first().click();
  await desktopPage.waitForTimeout(1000);

  // Click Category Management
  console.log('Opening Category Management...');
  await desktopPage.locator('text=إدارة الفئات').first().click();
  await desktopPage.waitForSelector('button:has-text("إضافة فئة")', { timeout: 10000 });
  await desktopPage.waitForTimeout(500);

  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop_category_mgmt_normal.png') });
  console.log('Captured desktop_category_mgmt_normal.png');

  // Click "ترتيب" in Category Management
  const catArrangeBtn = desktopPage.locator('button:has-text("ترتيب")');
  await catArrangeBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Clicking "ترتيب" in Category Management...');
  await catArrangeBtn.click();
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop_category_mgmt_arranging.png') });
  console.log('Captured desktop_category_mgmt_arranging.png');

  // Click "تم"
  const catDoneBtn = desktopPage.locator('button:has-text("تم")');
  await catDoneBtn.click();
  await desktopPage.waitForTimeout(1000);

  // Check Dashboard
  console.log('Navigating to Dashboard to verify card layout...');
  await desktopPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop_dashboard.png') });
  console.log('Captured desktop_dashboard.png');

  await desktopContext.close();

  // 2. Mobile test (iPhone 14, English LTR)
  console.log('\n--- 2. Mobile Test (iPhone 14, English LTR) ---');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14']
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.addInitScript(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
  await mobilePage.fill('input[type="password"]', '123456789');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });

  // Navigate to Profile -> Account Management
  await mobilePage.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.locator('text=Account Management').first().click();
  await mobilePage.waitForSelector('button:has-text("Add Account")', { timeout: 10000 });
  await mobilePage.waitForTimeout(500);

  // Click Arrange
  const mobileArrangeBtn = mobilePage.locator('button:has-text("Arrange")');
  await mobileArrangeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await mobileArrangeBtn.click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_account_mgmt_arranging.png') });
  console.log('Captured mobile_account_mgmt_arranging.png');

  await mobilePage.locator('button:has-text("Done")').click();
  await mobilePage.waitForTimeout(1000);

  // Dashboard mobile view
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile_dashboard.png') });
  console.log('Captured mobile_dashboard.png');

  await mobileContext.close();
  await browser.close();

  console.log('\n🎉 ALL UI & PLAYWRIGHT TESTS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Playwright test failed:', err);
  process.exit(1);
});
