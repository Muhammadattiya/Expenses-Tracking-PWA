import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function run() {
  const browser = await chromium.launch({ headless: true });

  const testCases = [
    { name: 'desktop-ar', lang: 'ar', isMobile: false, viewport: { width: 1280, height: 800 } },
    { name: 'mobile-ar', lang: 'ar', isMobile: true, device: devices['iPhone 14'] },
    { name: 'desktop-en', lang: 'en', isMobile: false, viewport: { width: 1280, height: 800 } },
    { name: 'mobile-en', lang: 'en', isMobile: true, device: devices['iPhone 14'] }
  ];

  // Authenticate once and save storage state
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  await authPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await authPage.fill('input[type="email"]', 'gemini@gmail.com');
  await authPage.fill('input[type="password"]', '123456789');
  await authPage.click('button[type="submit"]');
  await authPage.waitForURL('http://localhost:5173/', { timeout: 15000 });
  const storageState = await authContext.storageState();
  await authContext.close();

  for (const tc of testCases) {
    const contextOptions = tc.isMobile
      ? { ...tc.device, storageState }
      : { viewport: tc.viewport, deviceScaleFactor: 1, storageState };

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Listen to console errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      consoleLogs.push(`[PAGE ERROR] ${err.message}`);
    });

    // Set lang
    await page.addInitScript((l) => {
      localStorage.setItem('finova-lang', l);
    }, tc.lang);

    // Navigate to installments tab in receivables
    await page.goto('http://localhost:5173/receivables?tab=installments', { waitUntil: 'networkidle' });
    try {
      await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 });
    } catch (e) {
      console.log('Timeout waiting for animate-pulse to finish');
    }
    await page.waitForTimeout(500);

    // Capture main tab
    await page.screenshot({ path: `scripts/audit_installments_${tc.name}.png` });

    // Check touch targets and layout metrics
    const touchTargetIssues = await page.evaluate(() => {
      const issues = [];
      const buttons = Array.from(document.querySelectorAll('button, a, input, select'));
      buttons.forEach(el => {
        const rect = el.getBoundingClientRect();
        // check if visible
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 44 || rect.height < 44) {
            issues.push({
              tag: el.tagName,
              id: el.id,
              className: el.className,
              text: el.innerText ? el.innerText.substring(0, 30) : '',
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }
      });
      return issues;
    });

    // Check horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Open Add Installment Modal
    const addBtn = await page.$('#btn-add-installment') || await page.$('#btn-add-installment-empty');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `scripts/audit_installments_modal_${tc.name}.png` });
    }

    console.log(`=== Results for ${tc.name} ===`);
    console.log(`Horizontal overflow: ${hasHorizontalOverflow}`);
    console.log(`Small touch targets (<44px): ${touchTargetIssues.length}`);
    if (touchTargetIssues.length > 0) {
      console.log('Sample touch targets:', touchTargetIssues.slice(0, 5));
    }
    console.log(`Console errors: ${consoleLogs.length}`);
    if (consoleLogs.length > 0) {
      console.log('Errors:', consoleLogs);
    }

    await context.close();
  }

  await browser.close();
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
