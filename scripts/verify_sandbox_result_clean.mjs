import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/9e5bd045-a465-40b4-b5f2-7c101ea8595a';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runCleanVerification() {
  console.log('=== Starting Clean Verification for Sandbox Result Page ===');
  const browser = await chromium.launch({ headless: true });

  async function setupPage(isMobile = false, lang = 'ar') {
    const contextOptions = isMobile 
      ? { ...devices['iPhone 14'] }
      : { viewport: { width: 1280, height: 850 }, deviceScaleFactor: 1 };

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Browser Error][${lang}]:`, msg.text());
      }
    });

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
  }

  // 1. Desktop Arabic
  console.log('\n--- 1. Desktop Arabic Clean Verification ---');
  const { page: pageAr, context: ctxAr } = await setupPage(false, 'ar');
  await pageAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageAr.waitForTimeout(1000);

  // Trigger Installment Template
  const templateBtnAr = pageAr.locator('button').filter({ hasText: /تقسيط|كاش/i }).first();
  await templateBtnAr.waitFor({ state: 'visible', timeout: 8000 });
  await templateBtnAr.click();
  await pageAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await pageAr.waitForTimeout(1000);

  // Capture clean result top
  await pageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_result_desktop_ar.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_result_desktop_ar.png');

  // Scroll to bottom to verify action buttons clearance
  await pageAr.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageAr.waitForTimeout(500);
  await pageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_bottom_desktop_ar.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_bottom_desktop_ar.png');

  // Open Score Modal and capture
  const scoreBtn = pageAr.locator('button[aria-haspopup="dialog"]').first();
  if (await scoreBtn.count() > 0) {
    await scoreBtn.click();
    await pageAr.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    await pageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_score_modal_ar.png') });
    console.log('📸 Captured clean_sandbox_score_modal_ar.png');
    // Close modal via Escape
    await pageAr.keyboard.press('Escape');
    await pageAr.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 });
  }

  // Open Commit Modal and capture
  const commitBtn = pageAr.locator('#btn-commit-reality');
  await commitBtn.click();
  await pageAr.waitForSelector('[aria-labelledby="commit-plan-title"]', { state: 'visible', timeout: 5000 });
  await pageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_commit_modal_ar.png') });
  console.log('📸 Captured clean_sandbox_commit_modal_ar.png');
  // Close commit modal
  await pageAr.keyboard.press('Escape');
  await pageAr.waitForSelector('[aria-labelledby="commit-plan-title"]', { state: 'detached', timeout: 5000 });

  // Open breakdown and capture
  const breakdownBtnAr = pageAr.locator('#btn-financial-breakdown-toggle');
  await breakdownBtnAr.click();
  await pageAr.waitForTimeout(500);
  await pageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_breakdown_desktop_ar.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_breakdown_desktop_ar.png');

  await ctxAr.close();

  // 2. Mobile Arabic
  console.log('\n--- 2. Mobile Arabic Clean Verification ---');
  const { page: pageMobAr, context: ctxMobAr } = await setupPage(true, 'ar');
  await pageMobAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageMobAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageMobAr.waitForTimeout(1000);

  const mobTemplateBtnAr = pageMobAr.locator('button').filter({ hasText: /تقسيط|كاش/i }).first();
  await mobTemplateBtnAr.click();
  await pageMobAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await pageMobAr.waitForTimeout(1000);

  await pageMobAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_result_mobile_ar.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_result_mobile_ar.png');

  // Scroll mobile to bottom to verify clearance past BottomNav
  await pageMobAr.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageMobAr.waitForTimeout(500);
  await pageMobAr.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_mobile_chips_ar.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_mobile_chips_ar.png');

  await ctxMobAr.close();

  // 3. Desktop English
  console.log('\n--- 3. Desktop English Clean Verification ---');
  const { page: pageEn, context: ctxEn } = await setupPage(false, 'en');
  await pageEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await pageEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pageEn.waitForTimeout(1000);

  const templateBtnEn = pageEn.locator('button').filter({ hasText: /Installment|Cash/i }).first();
  await templateBtnEn.click();
  await pageEn.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await pageEn.waitForTimeout(1000);

  await pageEn.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_sandbox_result_desktop_en.png'), fullPage: false });
  console.log('📸 Captured clean_sandbox_result_desktop_en.png');

  await ctxEn.close();

  await browser.close();
  console.log('=== Clean Verification Complete! ===');
}

runCleanVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
