import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092';

async function run() {
  const browser = await chromium.launch({ headless: true });
  console.log('--- Starting Playwright UI Verification for Sandbox Redesign ---');

  const setupContextAndPage = async (isMobile = false, lang = 'ar') => {
    const contextOptions = isMobile 
      ? { ...devices['iPhone 14'] }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.addInitScript((l) => {
      localStorage.setItem('finova-lang', l);
    }, lang);

    // Login
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 12000 });

    return { context, page };
  };

  // 1. Desktop Arabic Test
  console.log('1. Testing Desktop Arabic...');
  const { page: pageDesktopAr } = await setupContextAndPage(false, 'ar');
  await pageDesktopAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageDesktopAr.waitForTimeout(1000);

  // Click Cash Template button
  console.log('Clicking template cash test button...');
  const cashBtn = pageDesktopAr.getByRole('button', { name: 'كاش (30 ألف)' });
  await cashBtn.click();
  
  // Wait for results
  await pageDesktopAr.waitForSelector('text=نتائج تقييم القرار المالي', { timeout: 10000 });
  await pageDesktopAr.waitForTimeout(1500);

  // Assertions for Redesigned Layout
  const verdictBanner = await pageDesktopAr.locator('h3:has-text("آمن وموصى به"), h3:has-text("قابل للتطبيق"), h3:has-text("خطر مالي"), h3:has-text("عجز في رصيد")').count();
  console.log('Verdict Banner found:', verdictBanner > 0);

  const shieldPillar = await pageDesktopAr.locator('text=تغطية درع الطوارئ').count();
  console.log('Shield Pillar found:', shieldPillar > 0);

  const paycheckPillar = await pageDesktopAr.locator('text=عبء الراتب الشهري').count();
  console.log('Paycheck Pillar found:', paycheckPillar > 0);

  const recoveryPillar = await pageDesktopAr.locator('text=فترة التعافي').count();
  console.log('Recovery Pillar found:', recoveryPillar > 0);

  const lowestPointCallout = await pageDesktopAr.locator('text=أقل نقطة رصيد متوقعة').count();
  console.log('Lowest Point Callout found:', lowestPointCallout > 0);

  // Assert purged items are NOT present
  const oldNetWorthCard = await pageDesktopAr.locator('text=صافي الثروة النقدية').count();
  console.log('Old Net Worth Card count (should be 0):', oldNetWorthCard);

  const oldBudgetUsageCard = await pageDesktopAr.locator('text=استخدام الميزانية').count();
  console.log('Old Budget Usage Card count (should be 0):', oldBudgetUsageCard);

  await pageDesktopAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_redesign_desktop_ar.png'), fullPage: true });

  // 2. Desktop English Test
  console.log('\n2. Testing Desktop English...');
  const { page: pageDesktopEn } = await setupContextAndPage(false, 'en');
  await pageDesktopEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageDesktopEn.waitForTimeout(1000);

  const instBtn = pageDesktopEn.getByRole('button', { name: 'Installment (12 Months)' });
  await instBtn.click();

  await pageDesktopEn.waitForSelector('text=Decision Evaluation Results', { timeout: 10000 });
  await pageDesktopEn.waitForTimeout(1500);

  const shieldPillarEn = await pageDesktopEn.locator('text=Emergency Shield Coverage').count();
  console.log('English Shield Pillar found:', shieldPillarEn > 0);

  const paycheckPillarEn = await pageDesktopEn.locator('text=Paycheck Commitment').count();
  console.log('English Paycheck Pillar found:', paycheckPillarEn > 0);

  const lowestPointEn = await pageDesktopEn.locator('text=Lowest Projected Balance').count();
  console.log('English Lowest Point Callout found:', lowestPointEn > 0);

  await pageDesktopEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_redesign_desktop_en.png'), fullPage: true });

  // 3. Mobile iPhone 14 Test (Arabic)
  console.log('\n3. Testing Mobile iPhone 14 (Arabic)...');
  const { page: pageMobileAr } = await setupContextAndPage(true, 'ar');
  await pageMobileAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageMobileAr.waitForTimeout(1000);

  const cashBtnMob = pageMobileAr.getByRole('button', { name: 'كاش (30 ألف)' });
  await cashBtnMob.click();

  await pageMobileAr.waitForSelector('text=نتائج تقييم القرار المالي', { timeout: 10000 });
  await pageMobileAr.waitForTimeout(1500);

  // Check horizontal overflow on mobile
  const scrollWidth = await pageMobileAr.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await pageMobileAr.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile width check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

  await pageMobileAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_redesign_mobile_ar.png'), fullPage: true });

  await browser.close();
  console.log('\n>>> PLAYWRIGHT UI VERIFICATION COMPLETED SUCCESSFULLY! <<<');
}

run().catch((err) => {
  console.error('Playwright Verification Failed:', err);
  process.exit(1);
});
