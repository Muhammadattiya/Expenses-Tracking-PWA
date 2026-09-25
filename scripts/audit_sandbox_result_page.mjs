import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/9e5bd045-a465-40b4-b5f2-7c101ea8595a';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('=== Starting Rigorous Technical Impeccable Audit for Sandbox Result Page ===');
  const browser = await chromium.launch({ headless: true });

  const auditReport = {
    touchTargets: [],
    ariaDefects: [],
    contrastDefects: [],
    responsiveOverflows: [],
    consoleErrors: [],
    domStats: {},
    modalChecks: {},
    colorTokens: []
  };

  async function setupPage(isMobile = false, lang = 'ar') {
    const contextOptions = isMobile 
      ? { ...devices['iPhone 14'] }
      : { viewport: { width: 1280, height: 850 }, deviceScaleFactor: 1 };

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        auditReport.consoleErrors.push({ text: msg.text(), location: msg.location() });
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

  // 1. Audit Desktop Arabic Result Page
  console.log('\n--- 1. Auditing Desktop Arabic Result Page ---');
  const { page: desktopAr, context: dCtxAr } = await setupPage(false, 'ar');
  await desktopAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await desktopAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await desktopAr.waitForTimeout(1000);

  // Trigger Installment Template: locator matching "تقسيط"
  const templateBtn = desktopAr.locator('button').filter({ hasText: /تقسيط|كاش/i }).first();
  await templateBtn.waitFor({ state: 'visible', timeout: 8000 });
  await templateBtn.click();
  console.log('Triggered template simulation...');

  // Wait for Result View to appear
  await desktopAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await desktopAr.waitForTimeout(1000);

  // Capture Desktop AR Screenshot
  await desktopAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_result_desktop_ar.png'), fullPage: true });
  console.log('📸 Captured sandbox_result_desktop_ar.png');

  // Check Touch Targets on Desktop AR Result Page
  const desktopButtons = await desktopAr.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
    return interactive.map(el => {
      const rect = el.getBoundingClientRect();
      const accessibleName = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText?.trim() || el.id;
      return {
        tag: el.tagName,
        name: accessibleName?.slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        ariaExpanded: el.getAttribute('aria-expanded'),
        ariaHasPopup: el.getAttribute('aria-haspopup'),
        role: el.getAttribute('role'),
        type: el.getAttribute('type'),
        className: el.className
      };
    });
  });

  // Check ARIA defects on result page
  const ariaChecks = await desktopAr.evaluate(() => {
    const defects = [];
    const accordionBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('التفاصيل المالية') || b.innerText?.includes('Financial Breakdown'));
    if (accordionBtn && !accordionBtn.hasAttribute('aria-expanded')) {
      defects.push({ element: 'Full Breakdown Accordion', issue: 'Missing aria-expanded attribute' });
    }

    const scoreBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('/100'));
    if (scoreBtn && (!scoreBtn.hasAttribute('aria-haspopup') || !scoreBtn.hasAttribute('aria-expanded'))) {
      defects.push({ element: 'Score Breakdown Trigger Button', issue: 'Missing aria-haspopup="dialog" and aria-expanded' });
    }

    const helpBtns = Array.from(document.querySelectorAll('button')).filter(b => b.getAttribute('title') === 'كيف تم الحساب؟' || b.getAttribute('title')?.includes('calculated'));
    helpBtns.forEach((btn, i) => {
      if (!btn.hasAttribute('aria-expanded')) {
        defects.push({ element: `Metric Hint Button #${i+1}`, issue: 'Missing aria-expanded attribute on disclosure widget' });
      }
    });

    return defects;
  });
  auditReport.ariaDefects.push(...ariaChecks);

  // Trajectory Chart removed per user direction (clean unboxed UI without charts)

  // Check Score Modal
  console.log('Opening Score Breakdown Modal...');
  const scoreTrigger = desktopAr.locator('button').filter({ hasText: /\/100/ }).first();
  if (await scoreTrigger.isVisible()) {
    await scoreTrigger.click();
    await desktopAr.waitForTimeout(500);
    await desktopAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_score_modal_desktop_ar.png') });
    console.log('📸 Captured sandbox_score_modal_desktop_ar.png');

    const scoreModalA11y = await desktopAr.evaluate(() => {
      const modalOverlay = document.querySelector('.fixed.inset-0.z-\\[100\\]');
      const innerCard = modalOverlay?.querySelector('.bg-\\[\\#1C1819\\]');
      const hasDialogRole = innerCard?.getAttribute('role') === 'dialog' || modalOverlay?.getAttribute('role') === 'dialog';
      const hasAriaModal = innerCard?.getAttribute('aria-modal') === 'true' || modalOverlay?.getAttribute('aria-modal') === 'true';
      const hasAriaLabelledBy = !!innerCard?.getAttribute('aria-labelledby');
      const heading = innerCard?.querySelector('h3');
      const closeBtn = innerCard?.querySelector('button');
      const closeRect = closeBtn?.getBoundingClientRect();

      return {
        foundModal: !!modalOverlay,
        hasDialogRole,
        hasAriaModal,
        hasAriaLabelledBy,
        headingId: heading?.id,
        closeBtnWidth: closeRect ? Math.round(closeRect.width) : null,
        closeBtnHeight: closeRect ? Math.round(closeRect.height) : null
      };
    });
    console.log('Score Modal A11y Check:', scoreModalA11y);
    auditReport.modalChecks.scoreModal = scoreModalA11y;

    // Test Escape key close
    await desktopAr.keyboard.press('Escape');
    await desktopAr.waitForTimeout(400);
    const closedOnEscape = await desktopAr.evaluate(() => {
      return !document.querySelector('.fixed.inset-0.z-\\[100\\]');
    });
    console.log('Score Modal closed on Escape key?', closedOnEscape);
    auditReport.modalChecks.scoreModalClosedOnEscape = closedOnEscape;

    if (!closedOnEscape) {
      // Close manually via button
      const closeBtn = desktopAr.locator('.fixed.inset-0.z-\\[100\\] button').filter({ hasText: /إغلاق|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await desktopAr.waitForTimeout(300);
    }
  }

  // Check Commit Plan Modal
  console.log('Opening Commit to Reality Modal...');
  const commitTrigger = desktopAr.locator('#btn-commit-reality');
  if (await commitTrigger.isVisible()) {
    await commitTrigger.click();
    await desktopAr.waitForTimeout(500);
    await desktopAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_commit_modal_desktop_ar.png') });
    console.log('📸 Captured sandbox_commit_modal_desktop_ar.png');

    const commitModalCheck = await desktopAr.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const plannedItems = Array.from(document.querySelectorAll('[role="dialog"] .p-3\\.5.rounded-2xl'));
      const itemsData = plannedItems.map(item => ({
        title: item.querySelector('p.text-xs')?.innerText,
        sub: item.querySelector('p.text-\\[10px\\]')?.innerText,
        detail: item.querySelector('span.text-xs')?.innerText
      }));

      return {
        hasDialogRole: !!dialog,
        hasAriaModal: dialog?.getAttribute('aria-modal') === 'true',
        hasAriaLabelledBy: !!dialog?.getAttribute('aria-labelledby'),
        itemsData
      };
    });
    console.log('Commit Modal Check:', commitModalCheck);
    auditReport.modalChecks.commitModal = commitModalCheck;

    // Close via Escape
    await desktopAr.keyboard.press('Escape');
    await desktopAr.waitForTimeout(400);
  }

  await dCtxAr.close();

  // 2. Audit Mobile Arabic Result Page (iPhone 14)
  console.log('\n--- 2. Auditing Mobile Arabic Result Page (iPhone 14) ---');
  const { page: mobileAr, context: mCtxAr } = await setupPage(true, 'ar');
  await mobileAr.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await mobileAr.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await mobileAr.waitForTimeout(1000);

  const mTemplateBtn = mobileAr.locator('button').filter({ hasText: /تقسيط|كاش/i }).first();
  await mTemplateBtn.waitFor({ state: 'visible', timeout: 8000 });
  await mTemplateBtn.click();
  await mobileAr.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await mobileAr.waitForTimeout(1000);

  // Check Mobile Touch Targets
  const mobileSmallTargets = await mobileAr.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
    const small = [];
    interactive.forEach(el => {
      const rect = el.getBoundingClientRect();
      const accessibleName = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText?.trim() || el.id;
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        small.push({
          tag: el.tagName,
          name: accessibleName?.slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          className: el.className?.slice(0, 40)
        });
      }
    });
    return small;
  });
  console.log(`Mobile AR: found ${mobileSmallTargets.length} elements with touch target < 44x44px:`, mobileSmallTargets);
  auditReport.touchTargets = mobileSmallTargets;

  // Check Horizontal Overflow
  const mobileOverflow = await mobileAr.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > docWidth + 2) {
        overflowing.push({
          tag: el.tagName,
          className: el.className?.slice(0, 50),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        });
      }
    });
    return { docWidth, bodyScrollWidth, hasDocOverflow: bodyScrollWidth > docWidth, overflowing: overflowing.slice(0, 5) };
  });
  console.log('Mobile AR Overflow Check:', mobileOverflow);
  auditReport.responsiveOverflows.push(mobileOverflow);

  // Capture Mobile AR Screenshot
  await mobileAr.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_result_mobile_ar.png'), fullPage: true });
  console.log('📸 Captured sandbox_result_mobile_ar.png');

  await mCtxAr.close();

  // 3. Audit Desktop English Result Page (LTR)
  console.log('\n--- 3. Auditing Desktop English Result Page (LTR) ---');
  const { page: desktopEn, context: dCtxEn } = await setupPage(false, 'en');
  await desktopEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await desktopEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await desktopEn.waitForTimeout(1000);

  const enTemplateBtn = desktopEn.locator('button').filter({ hasText: /Installment|Cash/i }).first();
  await enTemplateBtn.waitFor({ state: 'visible', timeout: 8000 });
  await enTemplateBtn.click();
  await desktopEn.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await desktopEn.waitForTimeout(1000);

  // Capture Desktop EN Screenshot
  await desktopEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_result_desktop_en.png'), fullPage: true });
  console.log('📸 Captured sandbox_result_desktop_en.png');

  // Expand Financial Breakdown on EN
  const enAccordion = desktopEn.locator('button').filter({ hasText: /Financial Breakdown/i }).first();
  if (await enAccordion.isVisible()) {
    await enAccordion.click();
    await desktopEn.waitForTimeout(400);
    await desktopEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_result_desktop_en_breakdown.png') });
    console.log('📸 Captured sandbox_result_desktop_en_breakdown.png');
  }

  // Check English Text truncation or missing translations
  const enTextAudit = await desktopEn.evaluate(() => {
    const textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const val = n.nodeValue.trim();
      if (val && !n.parentElement.closest('script, style')) {
        if (val.startsWith('sandbox.') || val.startsWith('common.')) {
          textNodes.push({ type: 'leaked_key', text: val });
        }
        const hasArabic = /[\u0600-\u06FF]/.test(val);
        if (hasArabic) {
          textNodes.push({ type: 'untranslated_arabic', text: val, parent: n.parentElement.tagName });
        }
      }
    }
    return textNodes;
  });
  console.log('English Mode Translation / Language Purity Findings:', enTextAudit);

  await dCtxEn.close();

  // 4. Audit Mobile English Result Page (iPhone 14)
  console.log('\n--- 4. Auditing Mobile English Result Page (iPhone 14) ---');
  const { page: mobileEn, context: mCtxEn } = await setupPage(true, 'en');
  await mobileEn.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await mobileEn.waitForSelector('[role="status"]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await mobileEn.waitForTimeout(1000);

  const mEnBtn = mobileEn.locator('button').filter({ hasText: /Installment|Cash/i }).first();
  await mEnBtn.waitFor({ state: 'visible', timeout: 8000 });
  await mEnBtn.click();
  await mobileEn.waitForSelector('#btn-commit-reality', { state: 'visible', timeout: 15000 });
  await mobileEn.waitForTimeout(1000);

  await mobileEn.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_result_mobile_en.png'), fullPage: true });
  console.log('📸 Captured sandbox_result_mobile_en.png');

  await mCtxEn.close();
  await browser.close();

  console.log('\n=== Audit Script Completed Successfully ===');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'audit_results.json'), JSON.stringify({ auditReport, enTextAudit, hasTrajectoryChart: false }, null, 2));
}

runAudit().catch(err => {
  console.error('Audit Script Failed:', err);
  process.exit(1);
});
