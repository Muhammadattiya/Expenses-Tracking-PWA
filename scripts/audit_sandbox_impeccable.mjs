import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/c687b85c-a621-4b18-a99e-7acb13531eb5';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('=== Starting Impeccable Audit for Sandbox ===');
  const browser = await chromium.launch({ headless: true });
  
  const findings = [];
  const logFinding = (severity, category, name, location, impact, wcag, recommendation) => {
    findings.push({ severity, category, name, location, impact, wcag, recommendation });
  };

  // Helper to login and set language
  async function setupContextAndPage(isMobile = false, lang = 'ar') {
    const contextOptions = isMobile 
      ? { ...devices['iPhone 14'] }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

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

  // 1. Desktop Arabic Audit (Initial State & Template Evaluation)
  console.log('\n--- 1. Desktop Arabic Audit ---');
  const { page: desktopPageAr } = await setupContextAndPage(false, 'ar');
  await desktopPageAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await desktopPageAr.waitForTimeout(1000);

  // Capture Initial State
  await desktopPageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_initial.png'), fullPage: true });

  // Check Touch targets on initial state
  const smallButtons = await desktopPageAr.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a, input, select'));
    const small = [];
    buttons.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        small.push({
          tag: el.tagName,
          text: (el.innerText || el.getAttribute('aria-label') || el.id || '').slice(0, 30),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          className: el.className
        });
      }
    });
    return small;
  });
  console.log(`Initial Desktop: found ${smallButtons.length} interactive elements with width or height < 44px:`, smallButtons.slice(0, 5));

  // Open a Modal (Purchase Modal)
  console.log('Opening Purchase Modal on Desktop AR...');
  const purchaseBtn = await desktopPageAr.$('button:has-text("شراء")');
  if (purchaseBtn) {
    await purchaseBtn.click();
    await desktopPageAr.waitForTimeout(500);
    await desktopPageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_modal_purchase.png') });
    
    // Check Modal a11y
    const modalA11y = await desktopPageAr.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const inputs = Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] select'));
      const unlabelled = inputs.filter(inp => {
        const id = inp.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const ariaLabel = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
        return !hasLabel && !ariaLabel;
      });
      return {
        hasDialogRole: !!dialog,
        hasAriaModal: dialog?.getAttribute('aria-modal') === 'true',
        hasAriaLabelledBy: !!dialog?.getAttribute('aria-labelledby'),
        unlabelledInputsCount: unlabelled.length
      };
    });
    console.log('Modal A11y Check:', modalA11y);

    // Close modal via Escape
    await desktopPageAr.keyboard.press('Escape');
    await desktopPageAr.waitForTimeout(500);
  }

  // Run Simulation via Template "تقسيط (12 شهر)"
  console.log('Running simulation via template...');
  const instBtn = await desktopPageAr.$('button:has-text("تقسيط (12 شهر)")');
  if (instBtn) {
    await instBtn.click();
    await desktopPageAr.waitForTimeout(3000);
    await desktopPageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_results.png'), fullPage: true });

    // Open Commit Modal
    const commitBtn = await desktopPageAr.$('#btn-commit-reality');
    if (commitBtn) {
      await commitBtn.click();
      await desktopPageAr.waitForTimeout(600);
      await desktopPageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_modal_commit.png') });
      await desktopPageAr.keyboard.press('Escape');
      await desktopPageAr.waitForTimeout(400);
    }
  }

  // 2. Mobile Arabic Audit (iPhone 14)
  console.log('\n--- 2. Mobile Arabic Audit (iPhone 14) ---');
  const { page: mobilePageAr } = await setupContextAndPage(true, 'ar');
  await mobilePageAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await mobilePageAr.waitForTimeout(1000);

  // Check horizontal overflow on mobile
  const hasHScroll = await mobilePageAr.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log('Mobile AR has horizontal overflow:', hasHScroll);

  await mobilePageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_mobile_ar_initial.png'), fullPage: true });

  // Run Simulation on mobile
  const mInstBtn = await mobilePageAr.$('button:has-text("تقسيط (12 شهر)")');
  if (mInstBtn) {
    await mInstBtn.click();
    await mobilePageAr.waitForTimeout(3000);
    await mobilePageAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_mobile_ar_results.png'), fullPage: true });
  }

  // 3. Desktop English Audit (LTR verification)
  console.log('\n--- 3. Desktop English Audit (LTR) ---');
  const { page: desktopPageEn } = await setupContextAndPage(false, 'en');
  await desktopPageEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await desktopPageEn.waitForTimeout(1000);

  await desktopPageEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_en_initial.png'), fullPage: true });

  // Run Cash template on English
  const enCashBtn = await desktopPageEn.$('button:has-text("Test Cash")');
  if (enCashBtn) {
    await enCashBtn.click();
    await desktopPageEn.waitForTimeout(3000);
    await desktopPageEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_en_results.png'), fullPage: true });
  }

  // Check for raw translation keys like "sandbox." or undefined in the DOM
  const rawKeyLeakage = await desktopPageEn.evaluate(() => {
    const textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) {
      const val = node.nodeValue.trim();
      if (val.startsWith('sandbox.') || val.startsWith('installments.') || val.startsWith('common.') || val.includes('undefined')) {
        textNodes.push(val);
      }
    }
    return textNodes;
  });
  console.log('Raw key leakage count (EN):', rawKeyLeakage.length, rawKeyLeakage);

  // Check Contrast Ratios on Key Elements
  const contrastAudit = await desktopPageEn.evaluate(() => {
    const getLuminance = (r, g, b) => {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };
    const parseRgb = (str) => {
      const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [255, 255, 255];
    };

    const elements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, button'));
    const lowContrast = [];
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const text = el.innerText?.trim();
      if (text && text.length > 2 && text.length < 50 && (color.includes('rgba') || color.includes('rgb'))) {
        const [r, g, b] = parseRgb(color);
        const l1 = getLuminance(r, g, b);
        // Approx dark background #100E11 -> rgb(16, 14, 17) -> L2 ~ 0.003
        const l2 = 0.003;
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 4.5 && !style.opacity.includes('0.')) {
          lowContrast.push({
            text: text.slice(0, 25),
            color,
            fontSize: style.fontSize,
            ratio: ratio.toFixed(2)
          });
        }
      }
    });
    return lowContrast.slice(0, 10);
  });
  console.log('Contrast check sampled items:', contrastAudit);

  await browser.close();
  console.log('=== Impeccable Audit Run Finished Successfully ===');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
