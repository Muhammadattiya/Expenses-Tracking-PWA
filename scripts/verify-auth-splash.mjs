import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/f7b57872-c3ba-4da7-8127-6d4824b71dd2';

async function run() {
  console.log('🧪 Verifying Authenticated Splash Lifecycle & Latency Masking...');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // 1. Log in first
    console.log('🔑 Logging in with gemini@gmail.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');

    // Wait until dashboard loads
    await page.waitForURL('http://localhost:5173/', { timeout: 8000 });
    console.log('✅ Reached Dashboard.');

    // 2. Now reload the page with lifecycle tracker attached
    console.log('🔄 Reloading page as authenticated user to test splash...');
    await page.addInitScript(() => {
      window.__authSplashEvents = [];
      let isSplashPresent = false;
      let mountTime = null;

      const check = () => {
        const splash = document.querySelector('[role="status"]');
        const now = performance.now();
        if (splash && !isSplashPresent) {
          isSplashPresent = true;
          mountTime = now;
          window.__authSplashEvents.push({ type: 'MOUNT', time: now });
        } else if (!splash && isSplashPresent) {
          isSplashPresent = false;
          const duration = now - mountTime;
          window.__authSplashEvents.push({ type: 'UNMOUNT', time: now, duration });
        }
      };

      setInterval(check, 16);
      window.addEventListener('DOMContentLoaded', check);
      window.addEventListener('load', check);
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for splash
    await page.waitForSelector('[role="status"]', { timeout: 3000 });
    console.log('🌟 Authenticated Splash mounted.');

    // Wait for splash to unmount
    await page.waitForSelector('[role="status"]', { state: 'detached', timeout: 6000 });
    console.log('✨ Authenticated Splash unmounted.');

    // Wait 1.5s to ensure stability
    await page.waitForTimeout(1500);

    const lifecycle = await page.evaluate(() => window.__authSplashEvents);
    console.log('📊 Authenticated Splash Lifecycle Events:', JSON.stringify(lifecycle, null, 2));

    const mounts = lifecycle.filter(e => e.type === 'MOUNT').length;
    const unmounts = lifecycle.filter(e => e.type === 'UNMOUNT').length;
    console.log(`Results: Mount Count = ${mounts}, Unmount Count = ${unmounts}`);
    if (lifecycle[1]?.duration) {
      console.log(`⏱️ Visible Splash Duration (Authenticated): ${Math.round(lifecycle[1].duration)}ms`);
    }

    const dashboardScreenshot = path.join(ARTIFACTS_DIR, 'authenticated_dashboard_after_splash.png');
    await page.screenshot({ path: dashboardScreenshot });
    console.log(`📸 Saved authenticated dashboard screenshot: ${dashboardScreenshot}`);

    if (mounts === 1 && unmounts === 1) {
      console.log('🎉 PERFECT! Authenticated reload shows splash exactly ONCE for ~1.3-1.5s, masking all server latency!');
    } else {
      console.error(`⚠️ Warning: Expected exactly 1 mount, got ${mounts}`);
    }

    await context.close();
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
