import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function testCard() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Arabic (RTL)
  console.log('Testing Desktop Arabic (RTL)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1
  });
  const pageAr = await desktopContext.newPage();
  pageAr.on('console', msg => console.log('PAGE [AR]:', msg.text()));
  pageAr.on('pageerror', err => console.log('PAGE ERROR [AR]:', err.message));

  await pageAr.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await pageAr.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await pageAr.fill('input[type="email"]', 'gemini@gmail.com');
  await pageAr.fill('input[type="password"]', '123456789');
  await pageAr.click('button[type="submit"]');
  await pageAr.waitForURL('http://localhost:5173/', { timeout: 8000 });
  
  // Wait for splash screen to disappear completely
  await pageAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageAr.waitForTimeout(1000);

  console.log('Navigating to /sandbox...');
  await pageAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageAr.waitForTimeout(1000);

  // Click on "شراء كاش" (Purchase)
  const purchaseBtn = pageAr.locator('button:has-text("شراء كاش"), button:has-text("Purchase")').first();
  await purchaseBtn.waitFor({ state: 'visible', timeout: 8000 });
  await purchaseBtn.click();
  await pageAr.waitForTimeout(500);

  await pageAr.fill('#sim-purchase-amount', '5000');

  // Select Bank account
  const selectBtn = pageAr.locator('[role="dialog"] button').filter({ hasText: /Bank|cash|Wallet|اختر الحساب/i }).first();
  await selectBtn.click();
  await pageAr.waitForTimeout(300);
  const bankOpt = pageAr.locator('[role="listbox"] [role="option"], div[role="dialog"] div').filter({ hasText: /Bank/i }).first();
  await bankOpt.click();
  await pageAr.waitForTimeout(300);

  // Submit modal
  await pageAr.locator('[role="dialog"] button[type="submit"]').first().click();
  await pageAr.waitForTimeout(600);

  // Run simulation
  const runBtn = pageAr.locator('#btn-run-simulation');
  await runBtn.waitFor({ state: 'visible', timeout: 8000 });
  await runBtn.click();
  await pageAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
  await pageAr.waitForTimeout(800);

  // Take screenshot
  await pageAr.screenshot({ 
    path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092/sandbox_minimal_card_desktop_ar.png',
    fullPage: false 
  });
  console.log('Saved sandbox_minimal_card_desktop_ar.png');

  // 2. Mobile iPhone 14
  console.log('Testing Mobile iPhone 14...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14']
  });
  const pageMobile = await mobileContext.newPage();
  await pageMobile.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await pageMobile.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await pageMobile.fill('input[type="email"]', 'gemini@gmail.com');
  await pageMobile.fill('input[type="password"]', '123456789');
  await pageMobile.click('button[type="submit"]');
  await pageMobile.waitForURL('http://localhost:5173/', { timeout: 8000 });
  await pageMobile.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageMobile.waitForTimeout(1000);

  await pageMobile.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageMobile.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageMobile.waitForTimeout(1000);

  const purchaseBtnM = pageMobile.locator('button:has-text("شراء كاش"), button:has-text("Purchase")').first();
  await purchaseBtnM.waitFor({ state: 'visible', timeout: 8000 });
  await purchaseBtnM.click();
  await pageMobile.waitForTimeout(500);
  await pageMobile.fill('#sim-purchase-amount', '5000');

  const selectBtnM = pageMobile.locator('[role="dialog"] button').filter({ hasText: /Bank|cash|Wallet|اختر الحساب/i }).first();
  await selectBtnM.click();
  await pageMobile.waitForTimeout(300);
  const bankOptM = pageMobile.locator('[role="listbox"] [role="option"], div[role="dialog"] div').filter({ hasText: /Bank/i }).first();
  await bankOptM.click();
  await pageMobile.waitForTimeout(300);

  await pageMobile.locator('[role="dialog"] button[type="submit"]').first().click();
  await pageMobile.waitForTimeout(600);
  const runBtnM = pageMobile.locator('#btn-run-simulation');
  await runBtnM.waitFor({ state: 'visible', timeout: 8000 });
  await runBtnM.click();
  await pageMobile.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
  await pageMobile.evaluate(() => window.scrollTo(0, 0));
  await pageMobile.waitForTimeout(400);

  await pageMobile.screenshot({ 
    path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092/sandbox_minimal_card_mobile_ar.png',
    fullPage: true 
  });
  console.log('Saved sandbox_minimal_card_mobile_ar.png');

  // 3. Desktop English (LTR)
  console.log('Testing Desktop English (LTR)...');
  const desktopContextEn = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1
  });
  const pageEn = await desktopContextEn.newPage();
  await pageEn.addInitScript(() => {
    localStorage.setItem('finova-lang', 'en');
  });

  await pageEn.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await pageEn.fill('input[type="email"]', 'gemini@gmail.com');
  await pageEn.fill('input[type="password"]', '123456789');
  await pageEn.click('button[type="submit"]');
  await pageEn.waitForURL('http://localhost:5173/', { timeout: 8000 });
  await pageEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageEn.waitForTimeout(1000);

  await pageEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageEn.waitForTimeout(1000);

  const purchaseBtnEn = pageEn.locator('button:has-text("Purchase")').first();
  await purchaseBtnEn.waitFor({ state: 'visible', timeout: 8000 });
  await purchaseBtnEn.click();
  await pageEn.waitForTimeout(500);
  await pageEn.fill('#sim-purchase-amount', '5000');

  const selectBtnEn = pageEn.locator('[role="dialog"] button').filter({ hasText: /Bank|cash|Wallet|Select Account/i }).first();
  await selectBtnEn.click();
  await pageEn.waitForTimeout(300);
  const bankOptEn = pageEn.locator('[role="listbox"] [role="option"], div[role="dialog"] div').filter({ hasText: /Bank/i }).first();
  await bankOptEn.click();
  await pageEn.waitForTimeout(300);

  await pageEn.locator('[role="dialog"] button[type="submit"]').first().click();
  await pageEn.waitForTimeout(600);
  const runBtnEn = pageEn.locator('#btn-run-simulation');
  await runBtnEn.waitFor({ state: 'visible', timeout: 8000 });
  await runBtnEn.click();
  await pageEn.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 12000 });
  await pageEn.waitForTimeout(800);

  await pageEn.screenshot({ 
    path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/b8d1fbcf-663d-46c1-9767-857877f8d092/sandbox_minimal_card_desktop_en.png',
    fullPage: false 
  });
  console.log('Saved sandbox_minimal_card_desktop_en.png');

  await browser.close();
  console.log('ALL MINIMAL CARD TESTS COMPLETED SUCCESSFULLY!');
}

testCard().catch(err => {
  console.error(err);
  process.exit(1);
});
