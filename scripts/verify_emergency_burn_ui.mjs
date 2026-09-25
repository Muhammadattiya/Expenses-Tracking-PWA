import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/ce0ec029-926b-435f-8b18-c1858bafa53e';

async function run() {
  console.log('--- Verifying Emergency Shield UI (Calculation Hint & Survival Categories) ---');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Context
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1
    });
    const page = await desktopContext.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    await page.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    console.log('Logging in on Desktop...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

    console.log('Navigating to Emergency Fund Planning Tab...');
    await page.goto('http://localhost:5173/planning?tab=emergency', { waitUntil: 'networkidle' });
    
    console.log('Waiting for FinancialShieldWidget to finish loading...');
    await page.waitForSelector('button:has-text("تفاصيل الحرق الشهري")', { timeout: 15000 });

    // Expand the Monthly Burn Breakdown drawer
    console.log('Expanding Monthly Burn Breakdown drawer...');
    const breakdownBtn = await page.$('button:has-text("تفاصيل الحرق الشهري")');
    if (breakdownBtn) {
      await breakdownBtn.click();
      await page.waitForTimeout(1000);
    }

    // Capture Desktop with Drawer open and Calculation Hint visible
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'desktop_emergency_fund_hint_drawer.png'),
      fullPage: true
    });
    console.log('Captured desktop_emergency_fund_hint_drawer.png');

    // Click "تخصيص فئات البقاء" button to open modal
    console.log('Opening Customize Survival Categories Modal...');
    const customizeBtn = await page.$('button:has-text("تخصيص فئات البقاء")');
    if (customizeBtn) {
      await customizeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Fallback to settings gear icon
      const settingsBtn = await page.$('button[aria-label="Customize Emergency Shield"], button:has(svg.lucide-settings)');
      if (settingsBtn) await settingsBtn.click();
      await page.waitForTimeout(1000);
    }

    // Capture Desktop with Categories Configuration Modal open
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'desktop_emergency_categories_modal.png'),
      fullPage: true
    });
    console.log('Captured desktop_emergency_categories_modal.png');

    await desktopContext.close();

    // 2. Mobile Context (iPhone 14)
    console.log('Testing Mobile (iPhone 14)...');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
    await mobilePage.fill('input[type="password"]', '123456789');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });

    await mobilePage.goto('http://localhost:5173/planning?tab=emergency', { waitUntil: 'networkidle' });
    await mobilePage.waitForSelector('button:has-text("تفاصيل الحرق الشهري")', { timeout: 15000 });

    const mobileBreakdownBtn = await mobilePage.$('button:has-text("تفاصيل الحرق الشهري")');
    if (mobileBreakdownBtn) {
      await mobileBreakdownBtn.click();
      await mobilePage.waitForTimeout(1000);
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, 'mobile_emergency_fund_hint_drawer.png'),
      fullPage: true
    });
    console.log('Captured mobile_emergency_fund_hint_drawer.png');

    const mobileCustomizeBtn = await mobilePage.$('button:has-text("تخصيص فئات البقاء")');
    if (mobileCustomizeBtn) {
      await mobileCustomizeBtn.click();
      await mobilePage.waitForTimeout(1000);
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, 'mobile_emergency_categories_modal.png'),
      fullPage: true
    });
    console.log('Captured mobile_emergency_categories_modal.png');

    await mobileContext.close();
    console.log('--- ALL UI VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('UI Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
