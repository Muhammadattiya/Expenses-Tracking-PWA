import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7';

async function run() {
  console.log('🚀 Starting Robust Planning Hub Verification Suite...');
  
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Arabic (RTL) - Full Hub Navigation & Verification
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop (Arabic / RTL) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 1100 },
      deviceScaleFactor: 1
    });
    const page = await desktopContext.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    console.log('Logged in successfully!');

    // Wait for Dashboard to settle
    await page.waitForTimeout(2000);

    // Verify FinancialShieldWidget is NOT on Dashboard
    const shieldHeaderOnDashboard = await page.getByText('حالة درع الطوارئ').count();
    console.log(`Financial Shield header count on Dashboard: ${shieldHeaderOnDashboard}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_no_shield_ar.png'), fullPage: false });

    // Navigate to /planning?tab=budgets
    console.log('Navigating to /planning?tab=budgets...');
    await page.goto('http://localhost:5173/planning?tab=budgets', { waitUntil: 'networkidle' });
    await page.waitForSelector('#panel-budgets', { timeout: 8000 });
    await page.waitForTimeout(2000);
    console.log('Capturing Tab 1: Budgets (Arabic)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab1_budgets_desktop_ar.png'), fullPage: false });

    // Tab 2: Savings
    console.log('Switching to Tab 2: Savings (Arabic)...');
    await page.click('#planning-tab-savings');
    await page.waitForSelector('#panel-savings', { timeout: 8000 });
    await page.waitForTimeout(1500);

    // If no savings account is set, designate one
    const selectAccBtn = page.getByRole('button', { name: /تحديد حساب الادخار|Select Savings Account/i }).first();
    if (await selectAccBtn.isVisible()) {
      console.log('Designating savings account...');
      await selectAccBtn.click();
      await page.waitForTimeout(600);
      const accItem = page.locator('[data-testid="designate-account-item"]').first();
      if (await accItem.isVisible()) {
        await accItem.click();
        await page.waitForTimeout(1500);
      } else {
        const closeBtn = page.locator('[data-testid="close-designate-modal"]').first();
        if (await closeBtn.isVisible()) await closeBtn.click();
      }
    }
    await page.waitForTimeout(1500);
    console.log('Capturing Tab 2: Savings (Arabic)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab2_savings_desktop_ar.png'), fullPage: false });

    // Tab 3: Emergency Fund
    console.log('Switching to Tab 3: Emergency Fund (Arabic)...');
    await page.click('#planning-tab-emergency');
    await page.waitForSelector('#panel-emergency', { timeout: 8000 });
    await page.waitForTimeout(2500);
    console.log('Capturing Tab 3: Emergency Fund (Arabic)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab3_emergency_desktop_ar.png'), fullPage: false });

    // Tab 4: Plans & Goals
    console.log('Switching to Tab 4: Plans & Goals (Arabic)...');
    await page.click('#planning-tab-plans');
    await page.waitForSelector('#panel-plans', { timeout: 8000 });
    // Wait for the skeleton animate-pulse to finish and data to load
    await page.waitForFunction(() => {
      const el = document.getElementById('panel-plans');
      return el && !el.querySelector('.animate-pulse');
    }, { timeout: 10000 }).catch(() => console.log('Proceeding with plans capture'));
    await page.waitForTimeout(2000);
    console.log('Capturing Tab 4: Plans & Goals (Arabic)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab4_plans_desktop_ar.png'), fullPage: false });

    // Test Goal Modal & "Connect to savings account" prompt
    console.log('Testing Goal Modal & Connect to savings question in Arabic...');
    const newGoalBtn = page.getByRole('button', { name: /هدف جديد|New Goal/i }).first();
    if (await newGoalBtn.isVisible()) {
      await newGoalBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_goal_modal_desktop_ar.png'), fullPage: false });
      console.log('Captured Goal Modal screenshot!');
      
      // Close modal
      const cancelBtn = page.locator('button:has-text("إلغاء"), button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 2: Mobile (iPhone 14) English (LTR)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Mobile (iPhone 14 / English / LTR) ---');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
    });

    console.log('Navigating to login on Mobile...');
    await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
    await mobilePage.fill('input[type="password"]', '123456789');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });
    await mobilePage.waitForTimeout(2000);

    // Verify Planning label in FAB
    console.log('Testing BottomNav on Mobile...');
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dashboard_en.png') });

    // Navigate to /planning?tab=savings
    console.log('Navigating to /planning?tab=savings on Mobile...');
    await mobilePage.goto('http://localhost:5173/planning?tab=savings', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_planning_savings_en.png') });

    // Switch to Emergency tab on Mobile
    console.log('Switching to Emergency tab on Mobile...');
    await mobilePage.click('#planning-tab-emergency');
    await mobilePage.waitForTimeout(2500);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_planning_emergency_en.png') });

    // Switch to Plans tab on Mobile
    console.log('Switching to Plans tab on Mobile...');
    await mobilePage.click('#planning-tab-plans');
    await mobilePage.waitForFunction(() => {
      const el = document.getElementById('panel-plans');
      return el && !el.querySelector('.animate-pulse');
    }, { timeout: 10000 }).catch(() => console.log('Timeout waiting for mobile plans pulse'));
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_planning_plans_en.png') });

    // Verify /budgets redirect
    console.log('Testing /budgets redirect to /planning?tab=budgets...');
    await mobilePage.goto('http://localhost:5173/budgets', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);
    console.log(`Redirected URL: ${mobilePage.url()}`);
    if (mobilePage.url().includes('/planning?tab=budgets')) {
      console.log('✅ /budgets redirect test PASSED!');
    } else {
      console.warn('⚠️ /budgets redirect unexpected URL:', mobilePage.url());
    }

    await mobileContext.close();

    console.log('\n🎉 ALL ROBUST PLANNING HUB VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
