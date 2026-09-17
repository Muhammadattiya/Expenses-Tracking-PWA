import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const playwrightPath = path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core');
const { chromium } = require(playwrightPath);

async function runAudit() {
  console.log('--- Starting Playwright Audit for Debts Page ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Collect console logs and errors
  const consoleLogs = [];
  const errors = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('2. Entering credentials for gemini@gmail.com...');
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="البريد" i]');
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="كلمة" i]');

  if (await emailInput.count() > 0) {
    await emailInput.first().fill('gemini@gmail.com');
    await passwordInput.first().fill('123456789');
    
    // Click submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    console.log('3. Logging in...');
    await page.waitForTimeout(3000);
  }

  console.log('4. Navigating to /receivables...');
  await page.goto('http://localhost:5173/receivables', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  console.log('Current URL:', page.url());

  // Take Desktop Screenshot of active tab
  await page.screenshot({ path: 'scratch/debts_desktop_tab1.png', fullPage: true });
  console.log('Saved scratch/debts_desktop_tab1.png');

  // Audit Tab 1 (Group Expenses or default)
  const auditResults = await page.evaluate(() => {
    const results = {
      title: document.title,
      url: window.location.href,
      h1: document.querySelector('h1')?.innerText || 'No H1',
      h2s: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
      buttons: [],
      inputs: [],
      touchTargets: [],
      contrastSample: [],
      overflowX: document.documentElement.scrollWidth > window.innerWidth
    };

    document.querySelectorAll('button').forEach((btn, i) => {
      const rect = btn.getBoundingClientRect();
      const isSmall = rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      const hasAria = btn.getAttribute('aria-label') || btn.innerText.trim();

      results.buttons.push({
        index: i,
        text: btn.innerText.slice(0, 30).trim(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isSmall,
        hasAria: !!hasAria,
        role: btn.getAttribute('role'),
        hasPopup: btn.getAttribute('aria-haspopup')
      });
      if (isSmall) {
        results.touchTargets.push({
          text: btn.innerText.slice(0, 30).trim() || 'Icon Button',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          classes: btn.className.slice(0, 50)
        });
      }
    });

    document.querySelectorAll('input').forEach((inp, i) => {
      results.inputs.push({
        type: inp.type,
        id: inp.id,
        hasLabel: !!document.querySelector(`label[for="${inp.id}"]`),
        ariaLabel: inp.getAttribute('aria-label'),
        placeholder: inp.placeholder
      });
    });

    return results;
  });

  console.log('Audit Results for Tab 1:', JSON.stringify(auditResults, null, 2));

  // Check Tab 2 (Personal Debts)
  console.log('5. Clicking second tab...');
  const tabs = page.locator('div.flex.justify-center button');
  const tabCount = await tabs.count();
  console.log(`Found ${tabCount} tab buttons`);
  let tab2Audit = null;
  if (tabCount >= 2) {
    await tabs.nth(1).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/debts_desktop_tab2.png', fullPage: true });
    console.log('Saved scratch/debts_desktop_tab2.png');

    tab2Audit = await page.evaluate(() => {
      const buttons = [];
      const smallTouchTargets = [];
      document.querySelectorAll('button').forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        const isSmall = rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        const hasAria = btn.getAttribute('aria-label') || btn.innerText.trim();
        buttons.push({
          index: i,
          text: btn.innerText.slice(0, 30).trim() || btn.getAttribute('aria-label') || 'Icon Button',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          isSmall,
          hasAria: !!hasAria
        });
        if (isSmall) {
          smallTouchTargets.push({
            text: btn.innerText.slice(0, 30).trim() || btn.getAttribute('aria-label') || 'Icon Button',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            classes: btn.className.slice(0, 60)
          });
        }
      });
      return { buttons, smallTouchTargets };
    });
  }

  // 6. Test Mobile Viewport (375 x 812 iPhone)
  console.log('6. Testing Mobile Viewport (375x812)...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/debts_mobile_tab2.png', fullPage: true });
  console.log('Saved scratch/debts_mobile_tab2.png');

  // Switch back to Tab 1 on mobile
  if (tabCount >= 1) {
    await tabs.nth(0).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/debts_mobile_tab1.png', fullPage: true });
    console.log('Saved scratch/debts_mobile_tab1.png');
  }

  const mobileAudit = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const smallTouchTargets = [];
    document.querySelectorAll('button, a, input, select').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        smallTouchTargets.push({
          tag: el.tagName,
          text: el.innerText?.slice(0, 25).trim() || el.getAttribute('aria-label') || 'unnamed',
          w: Math.round(r.width),
          h: Math.round(r.height),
          classes: el.className?.slice(0, 60)
        });
      }
    });

    return {
      hasHorizontalOverflow: docWidth > winWidth || bodyWidth > winWidth,
      docWidth,
      winWidth,
      smallTouchTargetCount: smallTouchTargets.length,
      smallTouchTargets: smallTouchTargets.slice(0, 15)
    };
  });

  console.log('Mobile Audit:', JSON.stringify(mobileAudit, null, 2));

  const perfMetrics = await page.evaluate(() => {
    const totalNodes = document.querySelectorAll('*').length;
    const imagesWithoutAlt = Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length;
    const svgCount = document.querySelectorAll('svg').length;
    return {
      totalNodes,
      imagesWithoutAlt,
      svgCount
    };
  });
  console.log('Performance Metrics:', JSON.stringify(perfMetrics, null, 2));
  console.log('Errors logged:', errors);

  await browser.close();
  console.log('--- Audit Completed Successfully ---');

  fs.writeFileSync('scratch/debts_audit_data.json', JSON.stringify({
    auditResults,
    mobileAudit,
    perfMetrics,
    errors,
    consoleLogs: consoleLogs.slice(-20)
  }, null, 2));
}

runAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
