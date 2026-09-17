import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/82a549c6-a5b7-4de4-aa2b-5eb7d08cfeac';

async function waitForProfile(page) {
  await page.waitForSelector('#profile-name', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('.animate-spin') || document.querySelector('#profile-name'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function verifyPolish() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('1. Navigating to Finova Login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('2. Logged in. Navigating to Profile page...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await waitForProfile(page);

  // Capture View State (English)
  const polishViewEnPath = path.join(ARTIFACTS_DIR, 'polish_profile_en_view.png');
  await page.screenshot({ path: polishViewEnPath });
  console.log('Captured polish_profile_en_view.png');

  // Click Edit button to enter edit mode
  console.log('4. Entering edit mode...');
  await page.click('button[aria-label="Edit Profile"], button[aria-label="تعديل الملف الشخصي"]');
  await page.waitForTimeout(400);

  await page.focus('#profile-name');
  const polishEditEnPath = path.join(ARTIFACTS_DIR, 'polish_profile_en_edit.png');
  await page.screenshot({ path: polishEditEnPath });
  console.log('Captured polish_profile_en_edit.png');

  // Validation error status pill with AlertCircle
  console.log('5. Triggering validation error for status pill...');
  await page.fill('#profile-name', 'A');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);

  const polishStatusErrorPath = path.join(ARTIFACTS_DIR, 'polish_status_error_pill.png');
  await page.screenshot({ path: polishStatusErrorPath });
  console.log('Captured polish_status_error_pill.png');

  // Successful save status pill with CheckCircle2
  console.log('6. Saving valid name...');
  await page.fill('#profile-name', 'Alex Vance');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);

  const polishStatusSuccessPath = path.join(ARTIFACTS_DIR, 'polish_status_success_pill.png');
  await page.screenshot({ path: polishStatusSuccessPath });
  console.log('Captured polish_status_success_pill.png');

  // Switch to Arabic RTL with finova-lang
  console.log('7. Switching to Arabic RTL (finova-lang)...');
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'ar');
  });
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await waitForProfile(page);

  const polishViewArPath = path.join(ARTIFACTS_DIR, 'polish_profile_ar_view.png');
  await page.screenshot({ path: polishViewArPath });
  console.log('Captured polish_profile_ar_view.png');

  // Enter edit mode in Arabic
  await page.click('button[aria-label="تعديل الملف الشخصي"], button[aria-label="Edit Profile"]');
  await page.waitForTimeout(400);
  const polishEditArPath = path.join(ARTIFACTS_DIR, 'polish_profile_ar_edit.png');
  await page.screenshot({ path: polishEditArPath });
  console.log('Captured polish_profile_ar_edit.png');

  // Reset back to English
  await page.evaluate(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await browser.close();
  console.log('Polish verification complete!');
}

verifyPolish().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
