import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    locale: 'ar'
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('Logging in with gemini@gmail.com...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 8000 });

  console.log('Setting hasCompletedOnboarding: false and navigating to /onboarding...');
  await page.evaluate(() => {
    const cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
    cached.hasCompletedOnboarding = false;
    localStorage.setItem('auth_user', JSON.stringify(cached));
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const results = [];

  for (let step = 1; step <= 10; step++) {
    console.log(`\nAuditing Step ${step}...`);

    // On Step 3, if overlay is present, dismiss it immediately
    if (step === 3) {
      try {
        const overlay = await page.waitForSelector('#income-overlay', { timeout: 1500 });
        if (overlay) {
          console.log('Dismissing income overlay on Step 3...');
          await overlay.click();
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // Overlay might have expired naturally or not shown
      }
    }

    // Wait for header button to be visible
    await page.waitForSelector('header button:last-child', { state: 'visible', timeout: 6000 });
    await page.waitForTimeout(300);

    // Get active step number from progress indicator
    const currentStepNum = await page.evaluate(() => {
      const activeSpan = document.querySelector('nav [role="group"] span');
      return activeSpan ? activeSpan.textContent.trim() : 'unknown';
    });

    console.log(`UI Step: ${currentStepNum}`);

    // Check for scrolling and overflowing elements
    const scrollInfo = await page.evaluate(() => {
      const main = document.querySelector('main');
      const body = document.body;
      const docEl = document.documentElement;

      const mainScrolls = main ? main.scrollHeight > main.clientHeight : false;
      const bodyScrolls = body.scrollHeight > window.innerHeight;
      const docScrolls = docEl.scrollHeight > window.innerHeight;

      const overflowingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
          overflowingElements.push({
            tag: el.tagName,
            class: el.className,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          });
        }
      });

      return {
        mainScrolls,
        bodyScrolls,
        docScrolls,
        overflowingElements
      };
    });

    // Check images
    const imagesInfo = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src.split('/').pop(),
        width: img.clientWidth,
        height: img.clientHeight
      }));
    });

    results.push({
      step,
      uiStep: currentStepNum,
      scrollInfo,
      images: imagesInfo
    });

    const screenshotPath = `scripts/audit_verified_step_${step}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    if (step < 10) {
      const nextBtn = await page.$('header button:last-child');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(600);
      }
    }
  }

  console.log('\n=== REAL AUDIT REPORT ===');
  let hasAnyScroll = false;
  results.forEach(r => {
    const s = r.scrollInfo;
    const isScrolling = s.mainScrolls || s.bodyScrolls || s.docScrolls || s.overflowingElements.length > 0;
    if (isScrolling) hasAnyScroll = true;
    console.log(`Step ${r.step} (UI Step Indicator: ${r.uiStep}):`);
    console.log(`  Scrollbar Detected: ${isScrolling ? 'YES (FAIL)' : 'NO (PERFECT)'}`);
    if (isScrolling) {
      console.log(`  Details: main=${s.mainScrolls}, body=${s.bodyScrolls}, doc=${s.docScrolls}, overflowEls=${JSON.stringify(s.overflowingElements)}`);
    }
    console.log(`  Images: ${r.images.map(i => `${i.src} (${i.width}x${i.height})`).join(', ') || 'None'}`);
  });

  console.log(`\nOVERALL SCROLL TEST: ${hasAnyScroll ? 'FAILED - SCROLLBARS FOUND' : 'PASSED - ZERO SCROLLBARS'}`);

  await browser.close();
})();
