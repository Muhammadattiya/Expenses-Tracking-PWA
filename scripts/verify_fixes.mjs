import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function verifyFixes() {
  console.log('--- Starting Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    locale: 'ar-EG'
  });

  const page = await context.newPage();

  // Test with Arabic RTL
  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  console.log('1. Logging in with test user...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(1000);

  console.log('Resetting onboarding state via backend API...');
  const resetRes = await page.evaluate(async () => {
    const res = await fetch('http://localhost:5000/api/auth/reset-onboarding', {
      method: 'PUT',
      credentials: 'include'
    });
    const data = await res.json().catch(() => null);
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    user.hasCompletedOnboarding = false;
    localStorage.setItem('auth_user', JSON.stringify(user));
    return data;
  });
  console.log('Reset response:', resetRes?.hasCompletedOnboarding);

  console.log('2. Navigating to /onboarding...');
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('Current URL after navigating:', page.url());
  await page.screenshot({ path: 'scripts/verify_onboarding_start.png' });

  // Step 1 -> Step 2
  console.log('Stepping to Step 2 (Make It to Payday)...');
  const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
  console.log('Found buttons:', await page.locator('button').count());
  await nextBtn.click();
  await page.waitForTimeout(600);

  // Step 2 -> Step 3: Check transition overlay
  console.log('Stepping from Step 2 to Step 3: clicking Next button...');
  // Explicitly click the Next button (the one that triggers handleNext)
  const headerButtons = page.locator('header button');
  console.log('Header buttons on Step 2:', await headerButtons.count());
  // The Next button is the second button in header
  const nextStepBtn = headerButtons.nth(1);
  await nextStepBtn.click();
  
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scripts/verify_step3_transition_attempt.png' });

  // Check what is in the DOM
  const pageHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('Is "screen3Overlay" or overlay text present in DOM?:', pageHtml.includes('أضف دخلك') || pageHtml.includes('Add Your Income') || pageHtml.includes('role="region"'));

  // Check overlay presence
  const overlayHeading = page.locator('h2').filter({ hasText: 'أضف دخلك' });
  const isOverlayVisible = await overlayHeading.isVisible().catch(() => false);
  console.log(`Transition overlay visible immediately after Make It to Payday: ${isOverlayVisible}`);
  if (!isOverlayVisible) {
    throw new Error('Transition overlay did not show after Make It to Payday!');
  }
  await page.screenshot({ path: 'scripts/verify_step3_overlay.png' });

  // Wait for overlay to transition into form
  console.log('Waiting for overlay transition to finish...');
  await page.waitForTimeout(2800);
  const isFormVisible = await page.locator('form').isVisible();
  console.log(`Income profile form visible after overlay: ${isFormVisible}`);
  await page.screenshot({ path: 'scripts/verify_step3_form.png' });

  // Skip Step 3 to go to Step 4 (Tracking Cycle)
  console.log('Skipping step 3 to go to Step 4 (Tracking cycle)...');
  await page.locator('header button').last().click();
  await page.waitForTimeout(600);

  // On Step 4, select "weekly" to show WheelPicker
  console.log('Selecting "weekly" in tracking cycle...');
  await page.selectOption('select', 'weekly');
  await page.waitForTimeout(500);

  // Inspect WheelPicker horizontal scroll properties
  const wheelMetrics = await page.evaluate(() => {
    const container = document.querySelector('[role="radiogroup"] > div:nth-child(2)');
    if (!container) return { error: 'No wheel container found' };
    
    const beforeScrollLeft = container.scrollLeft;
    // Attempt horizontal scroll
    container.scrollLeft = 100;
    container.dispatchEvent(new Event('scroll'));
    const afterScrollLeft = container.scrollLeft;

    const style = window.getComputedStyle(container);
    return {
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      canScrollX: container.scrollWidth > container.clientWidth,
      overflowX: style.overflowX,
      touchAction: style.touchAction,
      beforeScrollLeft,
      afterScrollLeft
    };
  });

  console.log('WheelPicker metrics:', wheelMetrics);
  if (wheelMetrics.canScrollX || wheelMetrics.afterScrollLeft !== 0) {
    throw new Error('WheelPicker allows horizontal swiping or scroll!');
  }
  console.log('✓ WheelPicker is strictly locked vertically. Horizontal swiping is impossible.');
  await page.screenshot({ path: 'scripts/verify_step4_wheel.png' });

  // Advance until we reach Step 10 (Push notifications)
  console.log('Advancing until we reach Step 10 (Push notifications)...');
  while (true) {
    const activePill = await page.locator('nav[aria-label="Progress"] span').innerText();
    console.log(`Current step: ${activePill}`);
    if (activePill === '10') break;
    const btn = page.locator('header button').last();
    await btn.click();
    await page.waitForTimeout(600);
  }

  // We are now on Step 10
  console.log('At Step 10 (Push Notifications)...');
  await page.screenshot({ path: 'scripts/verify_step10.png' });

  const finishBtn = page.locator('header button').last();
  const finishText = await finishBtn.innerText();
  console.log(`Finish button text: "${finishText}"`);

  // Click Finish
  console.log('Clicking Finish button...');
  await finishBtn.click();

  // Wait for finish navigation
  console.log('Waiting for redirect to home dashboard after finish...');
  await page.waitForURL('http://localhost:5173/', { timeout: 8000 });
  console.log('✓ Successfully navigated to / without hanging or spinning!');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/verify_dashboard_after_finish.png' });

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
  await browser.close();
}

verifyFixes().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
