import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6e93ad9c-602d-4778-a0ef-11ecf0eb05cd';

async function verifyAudit() {
  console.log('🔍 Running Post-Fix Re-Audit of Finova Splash Screen...');
  const browser = await chromium.launch({ headless: true });

  const auditReport = {
    viewports: {},
    a11y: {},
    perf: {},
    theming: {},
    responsive: {},
    integrity: {}
  };

  try {
    // 1. Desktop PC (Arabic RTL)
    const pcContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });
    const pcPage = await pcContext.newPage();
    await pcPage.addInitScript(() => localStorage.setItem('finova-lang', 'ar'));
    await pcPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await pcPage.waitForSelector('[role="status"]', { timeout: 4000 });

    const pcMetrics = await pcPage.evaluate(() => {
      const splash = document.querySelector('[role="status"]');
      const h1 = splash.querySelector('h1');
      const p = splash.querySelector('p');
      const medallion = splash.querySelector('svg').parentElement;
      const hairline = splash.querySelector('[aria-hidden="true"] .w-24, [aria-hidden="true"].w-24');
      const glowElements = Array.from(splash.querySelectorAll('.rounded-full'));

      const getStyles = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          willChange: cs.willChange,
          filter: cs.filter,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height
        };
      };

      return {
        role: splash.getAttribute('role'),
        ariaLabel: splash.getAttribute('aria-label'),
        dir: splash.getAttribute('dir'),
        h1Styles: getStyles(h1),
        pStyles: getStyles(p),
        medallionStyles: getStyles(medallion),
        hasHairlineProgress: !!hairline,
        glowWillChange: glowElements.map(el => window.getComputedStyle(el).willChange)
      };
    });

    await pcPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_desktop_ar_verified.png') });
    auditReport.viewports['desktop_ar'] = pcMetrics;
    await pcContext.close();

    // 2. Mobile iPhone 14 (Arabic RTL)
    const iphoneContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const iphonePage = await iphoneContext.newPage();
    await iphonePage.addInitScript(() => localStorage.setItem('finova-lang', 'ar'));
    await iphonePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const arSplashEl = await iphonePage.waitForSelector('[role="status"]', { timeout: 4000 });

    const iphoneMetrics = await arSplashEl.evaluate((splash) => {
      const h1 = splash.querySelector('h1');
      const p = splash.querySelector('p');
      const medallion = splash.querySelector('svg').parentElement;
      const mRect = medallion.getBoundingClientRect();

      return {
        medallionWidth: mRect.width,
        medallionHeight: mRect.height,
        isPerfectSquare: Math.abs(mRect.width - mRect.height) < 0.5,
        aspectRatio: mRect.width / mRect.height,
        h1FontSize: window.getComputedStyle(h1).fontSize,
        pFontSize: window.getComputedStyle(p).fontSize,
        pColor: window.getComputedStyle(p).color,
        pFontFamily: window.getComputedStyle(p).fontFamily
      };
    });
    await iphonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_iphone14_ar_verified.png') });
    auditReport.viewports['iphone14_ar'] = iphoneMetrics;
    await iphoneContext.close();

    // 3. Mobile iPhone 14 (English LTR)
    const iphoneEnContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const iphoneEnPage = await iphoneEnContext.newPage();
    await iphoneEnPage.addInitScript(() => localStorage.setItem('finova-lang', 'en'));
    await iphoneEnPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const enSplashEl = await iphoneEnPage.waitForSelector('[role="status"]', { timeout: 4000 });

    const iphoneEnMetrics = await enSplashEl.evaluate((splash) => {
      const p = splash.querySelector('p');
      const medallion = splash.querySelector('svg').parentElement;
      const mRect = medallion.getBoundingClientRect();
      return {
        dir: splash.getAttribute('dir'),
        ariaLabel: splash.getAttribute('aria-label'),
        tagline: p.textContent,
        medallionWidth: mRect.width,
        medallionHeight: mRect.height,
        isPerfectSquare: Math.abs(mRect.width - mRect.height) < 0.5
      };
    });

    await iphoneEnPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_iphone14_en_verified.png') });
    auditReport.viewports['iphone14_en'] = iphoneEnMetrics;
    await iphoneEnContext.close();

    // 4. Small screen test (iPhone SE 375x667)
    const seContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2
    });
    const sePage = await seContext.newPage();
    await sePage.addInitScript(() => localStorage.setItem('finova-lang', 'ar'));
    await sePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const seSplashEl = await sePage.waitForSelector('[role="status"]', { timeout: 4000 });

    const seMetrics = await seSplashEl.evaluate((splash) => {
      const medallion = splash.querySelector('svg').parentElement;
      const mRect = medallion.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        medallionWidth: mRect.width,
        medallionHeight: mRect.height,
        isPerfectSquare: Math.abs(mRect.width - mRect.height) < 0.5,
        hasVerticalOverflow: document.documentElement.scrollHeight > window.innerHeight
      };
    });
    await sePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_iphone_se_verified.png') });
    auditReport.viewports['iphone_se'] = seMetrics;
    await seContext.close();

    // 5. Reduced Motion Test
    const reducedMotionContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce'
    });
    const rmPage = await reducedMotionContext.newPage();
    await rmPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await rmPage.waitForSelector('[role="status"]', { timeout: 4000 });
    await rmPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_reduced_motion_verified.png') });
    await reducedMotionContext.close();

    console.log('✅ Post-fix re-audit completed successfully.');
    console.log('📊 iPhone 14 Results:', iphoneMetrics);
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'audit_verified_metrics.json'), JSON.stringify(auditReport, null, 2));
  } catch (err) {
    console.error('❌ Re-audit execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyAudit();
