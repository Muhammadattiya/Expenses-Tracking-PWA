import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/f7b57872-c3ba-4da7-8127-6d4824b71dd2';

async function run() {
  console.log('🚀 Running High-Speed Precision Playwright Tests...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop PC Test (Arabic Default, 1280x800)
    console.log('\n--- 1. Desktop PC Test ---');
    const pcContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await pcPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await pcPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const pcStatus = await pcPage.waitForSelector('[role="status"]', { timeout: 3000 });
    const pcData = await pcStatus.evaluate(el => ({
      label: el.getAttribute('aria-label'),
      dir: el.getAttribute('dir'),
      tagline: el.querySelector('p')?.textContent,
      title: el.querySelector('h1')?.textContent,
    }));
    const pcSplashImg = path.join(ARTIFACTS_DIR, 'splash_pc.png');
    await pcPage.screenshot({ path: pcSplashImg });
    console.log(`📸 Saved PC splash screenshot: ${pcSplashImg}`);
    console.log(`✅ PC Splash:`, pcData);
    await pcContext.close();

    // 2. iPhone 14 Test - Arabic RTL (390x844)
    console.log('\n--- 2. iPhone 14 Test (Arabic RTL) ---');
    const iPhone = devices['iPhone 14'];
    const iPhoneArContext = await browser.newContext({
      ...iPhone,
    });
    const iPhoneArPage = await iPhoneArContext.newPage();
    await iPhoneArPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await iPhoneArPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const arStatus = await iPhoneArPage.waitForSelector('[role="status"]', { timeout: 3000 });
    const arData = await arStatus.evaluate(el => ({
      label: el.getAttribute('aria-label'),
      dir: el.getAttribute('dir'),
      tagline: el.querySelector('p')?.textContent,
      title: el.querySelector('h1')?.textContent,
    }));
    const iPhoneArSplashImg = path.join(ARTIFACTS_DIR, 'splash_iphone_ar.png');
    await iPhoneArPage.screenshot({ path: iPhoneArSplashImg });
    console.log(`📸 Saved iPhone Arabic splash screenshot: ${iPhoneArSplashImg}`);
    console.log(`✅ iPhone Arabic Splash:`, arData);
    await iPhoneArContext.close();

    // 3. iPhone 14 Test - English LTR (390x844)
    console.log('\n--- 3. iPhone 14 Test (English LTR) ---');
    const iPhoneEnContext = await browser.newContext({
      ...iPhone,
    });
    const iPhoneEnPage = await iPhoneEnContext.newPage();
    await iPhoneEnPage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'en');
    });

    await iPhoneEnPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const enStatus = await iPhoneEnPage.waitForSelector('[role="status"]', { timeout: 3000 });
    const enData = await enStatus.evaluate(el => ({
      label: el.getAttribute('aria-label'),
      dir: el.getAttribute('dir'),
      tagline: el.querySelector('p')?.textContent,
      title: el.querySelector('h1')?.textContent,
    }));
    const iPhoneEnSplashImg = path.join(ARTIFACTS_DIR, 'splash_iphone_en.png');
    await iPhoneEnPage.screenshot({ path: iPhoneEnSplashImg });
    console.log(`📸 Saved iPhone English splash screenshot: ${iPhoneEnSplashImg}`);
    console.log(`✅ iPhone English Splash:`, enData);
    await iPhoneEnContext.close();

    console.log('\n✨ ALL PC & IPHONE TESTS FINISHED IN RECORD TIME!');
  } catch (err) {
    console.error('❌ Error during test run:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
