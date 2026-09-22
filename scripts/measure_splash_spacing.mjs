import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6e93ad9c-602d-4778-a0ef-11ecf0eb05cd';

async function test() {
  const browser = await chromium.launch({ headless: true });
  for (const [devName, devConfig] of Object.entries({
    'iPhone 14': devices['iPhone 14'],
    'iPhone 14 Pro Max': devices['iPhone 14 Pro Max'],
    'Pixel 7': devices['Pixel 7']
  })) {
    const context = await browser.newContext({ ...devConfig });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('finova-lang', 'ar'));
    await page.goto('http://localhost:5173/');
    const splash = await page.waitForSelector('[role="status"]');
    
    const bounds = await splash.evaluate(el => {
      const col = el.querySelector('.my-auto');
      const bottomBadge = el.querySelector('.relative.z-10.flex.flex-col.items-center.gap-1\\.5');
      const r = col.getBoundingClientRect();
      const bRect = bottomBadge.getBoundingClientRect();
      return {
        viewportH: window.innerHeight,
        viewportW: window.innerWidth,
        heroCenterY: r.top + r.height / 2,
        heroHeight: r.height,
        bottomBadgeY: bRect.top,
        bottomBadgeHeight: bRect.height,
        distanceFromBottomToScreenEdge: window.innerHeight - bRect.bottom
      };
    });
    console.log(devName, JSON.stringify(bounds, null, 2));

    const safeName = devName.toLowerCase().replace(/\s+/g, '_');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `splash_adapted_${safeName}_ar.png`) });
    await context.close();
  }
  await browser.close();
  console.log('✅ Adapted measurements and screenshots finished!');
}
test();
