import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function run() {
  console.log('--- Starting Profile Hardening Verification ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone viewport
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  // 1. Login
  console.log('1. Logging in as test user...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // 2. Navigate to Profile
  console.log('2. Navigating to /profile...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Ensure English locale for predictable text assertions
  await page.evaluate(() => localStorage.setItem('finova-lang', 'en'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Verify input font size is >= 16px to prevent iOS Safari auto-zoom
  const nameInput = page.locator('#profile-name');
  const fontSize = await nameInput.evaluate((el) => window.getComputedStyle(el).fontSize);
  console.log(`[TEST: iOS Viewport] #profile-name font-size: ${fontSize}`);
  const fontSizePx = parseFloat(fontSize);
  if (fontSizePx < 16) {
    console.error(`FAILED: Font size is ${fontSizePx}px, which triggers iOS Safari auto-zoom!`);
  } else {
    console.log('PASSED: Font size >= 16px (iOS auto-zoom immune).');
  }

  // Verify maxLength attributes
  const nameMaxLength = await nameInput.getAttribute('maxLength');
  console.log(`[TEST: Bounds] #profile-name maxLength: ${nameMaxLength} (Expected: 60)`);
  const phoneInput = page.locator('#profile-phone');
  const phoneMaxLength = await phoneInput.getAttribute('maxLength');
  console.log(`[TEST: Bounds] #profile-phone maxLength: ${phoneMaxLength} (Expected: 20)`);

  // 3. Test Enter Edit Mode
  console.log('3. Clicking Edit Profile button...');
  await page.click('button[aria-label="Edit Profile"], button:has-text("Edit Profile")');
  await page.waitForTimeout(500);

  // Check readOnly is false
  const isReadOnly = await nameInput.evaluate((el) => el.readOnly);
  console.log(`[TEST: Edit Mode] Is name input editable: ${!isReadOnly}`);

  // 4. Test Whitespace / Empty Name Validation
  console.log('4. Testing Empty / Whitespace-only Name validation...');
  await nameInput.fill('      ');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);

  const statusEl = page.locator('[role="status"]');
  const statusEmpty = await statusEl.textContent();
  console.log(`[TEST: Empty Name Error] Status message: "${statusEmpty?.trim()}"`);
  await page.screenshot({ path: 'scratch/harden_validation_error.png' });
  console.log('Saved scratch/harden_validation_error.png');

  // 5. Test Single Character Name Validation (< 2 chars)
  console.log('5. Testing Too Short Name (< 2 chars)...');
  await nameInput.fill('X');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);
  const statusShort = await statusEl.textContent();
  console.log(`[TEST: Too Short Error] Status message: "${statusShort?.trim()}"`);

  // 6. Test Escape Key Dismissal
  console.log('6. Testing Escape key dismissal...');
  await nameInput.fill('Unsaved Draft');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const isReadOnlyAfterEsc = await nameInput.evaluate((el) => el.readOnly);
  const valAfterEsc = await nameInput.inputValue();
  console.log(`[TEST: Escape Dismissal] Readonly: ${isReadOnlyAfterEsc}, Input restored: "${valAfterEsc}"`);

  // 7. Test Phone Number Sanitization with Spaces/Hyphens & Saving
  console.log('7. Testing Phone Number Sanitization & Clean Save...');
  await page.click('button[aria-label="Edit Profile"], button:has-text("Edit Profile")');
  await page.waitForTimeout(500);

  await nameInput.fill('Finova Champion');
  // Format with spaces and hyphens that previously broke the regex
  await phoneInput.fill('+20 100 234 5678');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const statusSuccess = await statusEl.textContent();
  console.log(`[TEST: Save Success] Status message: "${statusSuccess?.trim()}"`);
  await page.screenshot({ path: 'scratch/harden_save_success.png' });
  console.log('Saved scratch/harden_save_success.png');

  // 8. Test Auto-Dismissal of Success Banner (4-second timeout)
  console.log('8. Waiting 4.5s for success banner auto-dismissal...');
  await page.waitForTimeout(4500);
  const statusCount = await statusEl.count();
  const statusTextAfterWait = statusCount > 0 ? await statusEl.textContent() : '';
  console.log(`[TEST: Auto-Dismiss] Banner dismissed: ${statusTextAfterWait.trim() === ''}`);

  // 9. Test Image Upload & Client-side Canvas Compression
  console.log('9. Testing Image Upload & Compression...');
  const sampleImagePath = path.resolve('scratch/profile_ar_fixed.png');
  const fileChooserPromise = page.waitForEvent('filechooser');
  // Click camera button
  await page.click('button[aria-label="Change profile photo"]');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(sampleImagePath);
  await page.waitForTimeout(1200);

  // In edit mode after image selection, click Save Changes
  console.log('Saving compressed image profile...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const statusImageSave = await page.locator('[role="status"]').textContent().catch(() => '');
  console.log(`[TEST: Image Upload Status] Status message: "${statusImageSave?.trim()}"`);
  await page.screenshot({ path: 'scratch/harden_avatar_compressed.png' });
  console.log('Saved scratch/harden_avatar_compressed.png');

  // 10. Arabic RTL Validation Test
  console.log('10. Testing Arabic RTL Hardening...');
  await page.evaluate(() => localStorage.setItem('finova-lang', 'ar'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Click edit in Arabic
  await page.click('button[aria-label="تعديل الملف الشخصي"], button:has-text("تعديل الملف الشخصي")');
  await page.waitForTimeout(500);
  await nameInput.fill(' ');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);

  const arabicError = await page.locator('[role="status"]').textContent();
  console.log(`[TEST: Arabic Validation] Error: "${arabicError?.trim()}"`);
  await page.screenshot({ path: 'scratch/harden_profile_ar.png' });
  console.log('Saved scratch/harden_profile_ar.png');

  // Reset back to English
  await page.evaluate(() => localStorage.setItem('finova-lang', 'en'));

  await browser.close();
  console.log('--- Profile Hardening Verification Complete ---');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
