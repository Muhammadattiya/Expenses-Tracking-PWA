import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function run() {
  console.log('--- Starting Profile Clarify Verification ---');
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

  // 2. English Profile Verification
  console.log('2. Navigating to /profile (English)...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('finova-lang', 'en'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Verify Kicker is removed
  const kickerCount = await page.locator('h2:has-text("MANAGE YOUR ACCOUNT"), h2:has-text("Manage your account")').count();
  console.log(`[TEST: No Kicker] Uppercase kicker count: ${kickerCount} (Expected: 0)`);

  // Verify Hero Title
  const heroTitle = await page.locator('header h1').textContent();
  console.log(`[TEST: Hero Title] Main header title: "${heroTitle?.trim()}"`);

  // Verify Email locked hint
  const emailHint = await page.locator('text=Linked to login account').count();
  console.log(`[TEST: Email Hint] "Linked to login account" visible: ${emailHint > 0}`);

  // Verify Preferences hub subtitles
  const accountDesc = await page.locator('text=Wallets, cards & bank accounts').count();
  const categoryDesc = await page.locator('text=Expense & income categories').count();
  const incomeDesc = await page.locator('text=Salaries, subscriptions & repeat bills').count();
  const trackingDesc = await page.locator('text=Monthly or weekly budget period').count();
  console.log(`[TEST: Preference Descriptions] Subtitles found: Acc=${accountDesc}, Cat=${categoryDesc}, Inc=${incomeDesc}, Trk=${trackingDesc}`);

  await page.screenshot({ path: 'scratch/clarify_profile_en_view.png' });
  console.log('Saved scratch/clarify_profile_en_view.png');

  // 3. English Edit Mode
  console.log('3. Opening Edit Mode (English)...');
  await page.click('button[aria-label="Edit Profile"], button:has-text("Edit Profile")');
  await page.waitForTimeout(600);

  // Check name placeholder
  const namePlaceholder = await page.locator('#profile-name').getAttribute('placeholder');
  console.log(`[TEST: Name Placeholder] Placeholder: "${namePlaceholder}" (Expected: e.g. Alex Vance)`);

  // Check edit allowance copy
  const editAllowanceText = await page.locator('text=Profile edits remaining this cycle:').textContent();
  console.log(`[TEST: Edits Allowance Text] "${editAllowanceText?.trim()}"`);

  await page.screenshot({ path: 'scratch/clarify_profile_en_edit.png' });
  console.log('Saved scratch/clarify_profile_en_edit.png');

  // Cancel edit mode
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. Logout Confirmation Modal
  console.log('4. Testing Logout Modal Clarified Copy...');
  const logoutTrigger = page.locator('button:has-text("Log Out")').last();
  await logoutTrigger.scrollIntoViewIfNeeded();
  await logoutTrigger.click();
  await page.waitForTimeout(600);

  const modalTitle = await page.locator('[role="dialog"] h2').textContent();
  const modalMessage = await page.locator('[role="dialog"] div.text-sm').textContent();
  const stayBtn = await page.locator('button:has-text("Stay Logged In")').count();
  const logoutBtn = await page.locator('[role="dialog"] button:has-text("Log Out")').count();
  console.log(`[TEST: Modal Title] "${modalTitle?.trim()}"`);
  console.log(`[TEST: Modal Message] "${modalMessage?.trim()}"`);
  console.log(`[TEST: Modal Buttons] "Stay Logged In": ${stayBtn > 0}, "Log Out": ${logoutBtn > 0}`);

  await page.screenshot({ path: 'scratch/clarify_logout_modal.png' });
  console.log('Saved scratch/clarify_logout_modal.png');

  // Dismiss modal
  await page.click('button:has-text("Stay Logged In")');
  await page.waitForTimeout(500);

  // 5. Arabic RTL Clarification
  console.log('5. Navigating to /profile (Arabic RTL)...');
  await page.evaluate(() => localStorage.setItem('finova-lang', 'ar'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const arKickerCount = await page.locator('h2:has-text("إدارة حسابك")').count();
  console.log(`[TEST: Arabic No Kicker] Kicker count: ${arKickerCount} (Expected: 0)`);

  const arEmailHint = await page.locator('text=مرتبط بحساب تسجيل الدخول').count();
  console.log(`[TEST: Arabic Email Hint] Hint found: ${arEmailHint > 0}`);

  const arAccountDesc = await page.locator('text=المحافظ والبطاقات والحسابات البنكية').count();
  console.log(`[TEST: Arabic Preference Hub] Subtitle found: ${arAccountDesc > 0}`);

  await page.screenshot({ path: 'scratch/clarify_profile_ar_view.png' });
  console.log('Saved scratch/clarify_profile_ar_view.png');

  // Arabic Edit Mode
  console.log('Opening Edit Mode (Arabic)...');
  await page.click('button[aria-label="تعديل الملف الشخصي"], button:has-text("تعديل الملف الشخصي")');
  await page.waitForTimeout(600);

  const arNamePlaceholder = await page.locator('#profile-name').getAttribute('placeholder');
  console.log(`[TEST: Arabic Name Placeholder] "${arNamePlaceholder}"`);

  await page.screenshot({ path: 'scratch/clarify_profile_ar_edit.png' });
  console.log('Saved scratch/clarify_profile_ar_edit.png');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Reset back to English
  await page.evaluate(() => localStorage.setItem('finova-lang', 'en'));

  await browser.close();
  console.log('--- Profile Clarify Verification Complete ---');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
