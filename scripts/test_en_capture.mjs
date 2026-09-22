import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACTS_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6e93ad9c-602d-4778-a0ef-11ecf0eb05cd';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('finova-lang', 'en'));
  await page.goto('http://localhost:5173/');
  const el = await page.waitForSelector('[role="status"]');
  await el.screenshot({ path: path.join(ARTIFACTS_DIR, 'splash_adapted_iphone_14_en.png') });
  await context.close();
  await browser.close();
  console.log('✅ English iPhone 14 capture complete');
}
test();
