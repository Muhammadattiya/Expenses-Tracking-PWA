import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/b4bedc1c-fb58-442c-b780-35e6dac463c2';
const BASE_URL = 'http://localhost:5174';

async function run() {
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched successfully.');

  try {
    // 1. Desktop Context (1280x800) - Arabic (RTL)
    console.log('Testing Desktop RTL...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });
    const desktopPage = await desktopContext.newPage();

    // Welcome screen in Arabic
    await desktopPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    });
    await desktopPage.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'welcome_desktop_ar.png') });
    console.log('Saved welcome_desktop_ar.png');

    // Onboarding in Arabic (RTL)
    await desktopPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
      localStorage.setItem('auth_user', JSON.stringify({
        _id: 'test-user-id',
        email: 'test@finova.com',
        name: 'Test User',
        hasCompletedOnboarding: false
      }));
      localStorage.setItem('auth_token', 'test-token');
    });

    await desktopPage.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step1_desktop_ar.png') });
    console.log('Saved onboarding_step1_desktop_ar.png');

    // 2. Mobile Context (iPhone 14) - Arabic & English
    console.log('Testing Mobile iPhone 14...');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
      localStorage.setItem('auth_user', JSON.stringify({
        _id: 'test-user-id',
        email: 'test@finova.com',
        name: 'Test User',
        hasCompletedOnboarding: false
      }));
      localStorage.setItem('auth_token', 'test-token');
    });

    await mobilePage.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step1_mobile_ar.png') });
    console.log('Saved step 1');

    // Advance to Step 2
    const nextBtn = mobilePage.locator('header button').last();
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step2_mobile_ar.png') });
    console.log('Saved step 2');

    // Advance to Step 3 (IncomeProfileStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step3_income_mobile_ar.png') });
    console.log('Saved step 3 (Income)');

    // Advance to Step 4 (TrackingCycleStep) - Skip income profile
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step4_cycle_mobile_ar.png') });
    console.log('Saved step 4 (Tracking Cycle)');

    // Advance to Step 5 (VoiceMockupStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step5_voice_mobile_ar.png') });
    console.log('Saved step 5 (Voice)');

    // Advance to Step 6 (SetupInitialDataStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step6_setup_mobile_ar.png') });
    console.log('Saved step 6 (Setup Initial Data)');

    // Advance to Step 7 (NovaAgentMockupStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step7_nova_mobile_ar.png') });
    console.log('Saved step 7 (Nova Agent)');

    // Advance to Step 8 (SmartBudgetMockupStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step8_budget_mobile_ar.png') });
    console.log('Saved step 8 (Smart Budget)');

    // Advance to Step 9 (EffortlessTrackingStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step9_effortless_mobile_ar.png') });
    console.log('Saved step 9 (Effortless Tracking)');

    // Advance to Step 10 (PushNotificationsStep)
    await nextBtn.click();
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step10_push_mobile_ar.png') });
    console.log('Saved step 10 (Push Notifications)');

    // Also test Step 3 & 4 in English (LTR)
    console.log('Testing English LTR...');
    const enContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const enPage = await enContext.newPage();
    await enPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
      localStorage.setItem('auth_user', JSON.stringify({
        _id: 'test-user-id',
        email: 'test@finova.com',
        name: 'Test User',
        hasCompletedOnboarding: false
      }));
      localStorage.setItem('auth_token', 'test-token');
    });

    await enPage.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await enPage.waitForTimeout(500);
    const enNextBtn = enPage.locator('header button').last();
    await enNextBtn.click(); // to step 2
    await enPage.waitForTimeout(400);
    await enNextBtn.click(); // to step 3
    await enPage.waitForTimeout(600);
    await enPage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step3_income_mobile_en.png') });
    console.log('Saved step 3 English');

    await enNextBtn.click(); // to step 4
    await enPage.waitForTimeout(600);
    await enPage.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_step4_cycle_mobile_en.png') });
    console.log('Saved step 4 English');

    console.log('ALL PLAYWRIGHT TESTS AND SCREENSHOTS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Playwright script error:', err);
  process.exit(1);
});
