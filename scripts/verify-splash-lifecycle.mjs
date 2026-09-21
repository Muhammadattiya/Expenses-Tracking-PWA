import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/f7b57872-c3ba-4da7-8127-6d4824b71dd2';

async function run() {
  console.log('🧪 Verifying Splash Lifecycle & Latency Masking...');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Attach lifecycle tracker inside the browser
    await page.addInitScript(() => {
      window.__splashEvents = [];
      let isSplashPresent = false;
      let mountTime = null;

      const check = () => {
        const splash = document.querySelector('[role="status"]');
        const now = performance.now();
        if (splash && !isSplashPresent) {
          isSplashPresent = true;
          mountTime = now;
          window.__splashEvents.push({ type: 'MOUNT', time: now });
        } else if (!splash && isSplashPresent) {
          isSplashPresent = false;
          const duration = now - mountTime;
          window.__splashEvents.push({ type: 'UNMOUNT', time: now, duration });
        }
      };

      setInterval(check, 16); // 60fps check
      window.addEventListener('DOMContentLoaded', check);
      window.addEventListener('load', check);
    });

    const startNav = Date.now();
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    // Wait for the splash screen to appear
    await page.waitForSelector('[role="status"]', { timeout: 3000 });
    console.log('🌟 Splash screen mounted successfully.');
    
    // Screenshot during active splash
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_active_verified.png') });

    // Wait for splash screen to smoothly detach / unmount
    await page.waitForSelector('[role="status"]', { state: 'detached', timeout: 5000 });
    console.log('✨ Splash screen smoothly unmounted.');

    // Wait 1.5s after unmount to confirm it NEVER mounts again
    await page.waitForTimeout(1500);

    const lifecycle = await page.evaluate(() => window.__splashEvents);
    console.log('📊 Splash Lifecycle Events:', JSON.stringify(lifecycle, null, 2));

    const mounts = lifecycle.filter(e => e.type === 'MOUNT').length;
    const unmounts = lifecycle.filter(e => e.type === 'UNMOUNT').length;

    console.log(`\nResults: Mount Count = ${mounts}, Unmount Count = ${unmounts}`);
    if (lifecycle[1]?.duration) {
      console.log(`⏱️ Visible Splash Duration: ${Math.round(lifecycle[1].duration)}ms (covers latency)`);
    }

    if (mounts === 1 && unmounts === 1) {
      console.log('✅ PERFECT! Splash screen opened and closed EXACTLY ONCE with no flickering or re-opening!');
    } else {
      console.error(`⚠️ Warning: Expected exactly 1 mount, got ${mounts}`);
    }

    // Capture screen after transition
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_after_splash.png') });

    await context.close();
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
