import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  console.log('2. Navigating to /profile (English)...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const editBtnBox = await page.locator('button[aria-label="Edit Profile"], button[aria-label="Edit profile"]').boundingBox();
  console.log('Edit Profile Button Box:', editBtnBox);

  const settingsBtnBox = await page.locator('a[aria-label="Settings"]').boundingBox();
  console.log('Settings Link Box:', settingsBtnBox);

  const cameraBtnBox = await page.locator('button[aria-label="Change profile photo"]').last().boundingBox();
  console.log('Camera Button Box:', cameraBtnBox);

  await page.screenshot({ path: 'scratch/profile_en_fixed.png' });
  console.log('Saved scratch/profile_en_fixed.png');

  console.log('3. Testing Arabic RTL layout...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/profile_ar_fixed.png' });
  console.log('Saved scratch/profile_ar_fixed.png');

  console.log('4. Navigating into Account Management...');
  await page.click('button:has-text("Account Management"), button:has-text("إدارة الحسابات"), button:has(svg.lucide-wallet)');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/account_management_ar.png' });
  console.log('Saved scratch/account_management_ar.png');

  await page.click('button:has(svg.lucide-arrow-left)');
  await page.waitForTimeout(1000);

  console.log('5. Navigating into Category Management...');
  await page.click('button:has-text("Category Management"), button:has-text("إدارة الفئات"), button:has(svg.lucide-tag)');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/category_management_ar.png' });
  console.log('Saved scratch/category_management_ar.png');

  await page.click('button:has(svg.lucide-arrow-left)');
  await page.waitForTimeout(1000);

  console.log('6. Navigating into Income & Recurring Management...');
  await page.click('button:has-text("Income Profile"), button:has-text("مصادر الدخل"), button:has(svg.lucide-repeat)');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/income_recurring_ar.png' });
  console.log('Saved scratch/income_recurring_ar.png');

  await page.click('button:has(svg.lucide-repeat)');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratch/recurring_tab_ar.png' });
  console.log('Saved scratch/recurring_tab_ar.png');

  await page.click('button:has(svg.lucide-arrow-left)');
  await page.waitForTimeout(1000);

  console.log('7. Navigating into Tracking Cycle Management...');
  await page.click('button:has-text("Tracking Cycle"), button:has-text("دورة التتبع"), button:has(svg.lucide-refresh-ccw)');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/tracking_cycle_ar.png' });
  console.log('Saved scratch/tracking_cycle_ar.png');

  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await browser.close();
  console.log('Verification script completed successfully!');
}

run().catch(err => {
  console.error('Profile verification error:', err);
  process.exit(1);
});
