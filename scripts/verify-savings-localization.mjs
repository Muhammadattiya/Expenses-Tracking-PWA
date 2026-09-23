import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7';

async function run() {
  console.log('[TEST] Launching browser...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Mobile (iPhone 14) view matching user's screen in English
    console.log('[TEST] Setting up iPhone 14 context with English language...');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });

    const page = await mobileContext.newPage();

    // Force English language
    await page.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
    });

    // Login
    console.log('[TEST] Logging in as gemini@gmail.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    console.log('[TEST] Logged in successfully.');

    // Navigate to savings tab
    console.log('[TEST] Navigating to http://localhost:5173/planning?tab=savings...');
    await page.goto('http://localhost:5173/planning?tab=savings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Capture mobile savings screenshot
    await page.screenshot({ path: `${ARTIFACT_DIR}/savings_tab_english_mobile.png`, fullPage: true });
    console.log('[TEST] Mobile screenshot saved: savings_tab_english_mobile.png');

    // Inspect page text for Arabic characters
    const pageText = await page.evaluate(() => document.body.innerText);
    const arabicRegex = /[\u0600-\u06FF]/g;
    const arabicMatches = pageText.match(arabicRegex);

    console.log('[TEST] Text analysis in English mode:');
    if (pageText.includes('Imported Transaction')) {
      console.log('  SUCCESS: Found "Imported Transaction" in recent activity!');
    } else {
      console.log('  NOTE: "Imported Transaction" not found directly, checking text...');
    }

    if (pageText.includes('معاملة مستوردة')) {
      console.error('  FAIL: Found "معاملة مستوردة" on page when lang=en!');
    } else {
      console.log('  SUCCESS: "معاملة مستوردة" is completely gone from the page!');
    }

    // Check specific transaction title elements
    const txTitles = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.font-bold.text-white.truncate'));
      return elements.map(el => el.textContent.trim());
    });
    console.log('[TEST] Recent activity titles found:', txTitles);

    // 2. Desktop view
    console.log('[TEST] Setting up Desktop context with English language...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
    });

    await desktopPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await desktopPage.fill('input[type="email"]', 'gemini@gmail.com');
    await desktopPage.fill('input[type="password"]', '123456789');
    await desktopPage.click('button[type="submit"]');
    await desktopPage.waitForURL('http://localhost:5173/', { timeout: 10000 });

    await desktopPage.goto('http://localhost:5173/planning?tab=savings', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);
    await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/savings_tab_english_desktop.png`, fullPage: true });
    console.log('[TEST] Desktop screenshot saved: savings_tab_english_desktop.png');

    await mobileContext.close();
    await desktopContext.close();
    console.log('[TEST] Test completed successfully.');
  } catch (err) {
    console.error('[TEST ERROR]:', err);
  } finally {
    await browser.close();
  }
}

run();
