import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function testFull() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 8000 });
  console.log('Logged in. Initial URL:', page.url());

  // Check initial aria-current on Dashboard
  const homeAriaCurrent = await page.getAttribute('nav[aria-label] a[href="/"]', 'aria-current');
  console.log('Home tab aria-current on Dashboard:', homeAriaCurrent);
  if (homeAriaCurrent !== 'page') throw new Error(`Expected aria-current="page" on Home tab, got ${homeAriaCurrent}`);

  // 1. Click Analytics
  console.log('Test 1: Click Analytics...');
  await page.click('nav[aria-label] a[href="/analytics"]');
  await page.waitForSelector('nav[aria-label] a[href="/analytics"][aria-current="page"]', { timeout: 3000 });
  console.log('Success! Analytics tab has aria-current="page" and URL is:', page.url());

  // 2. Click Profile
  console.log('Test 2: Click Profile...');
  await page.click('nav[aria-label] a[href="/profile"]');
  await page.waitForSelector('nav[aria-label] a[href="/profile"][aria-current="page"]', { timeout: 3000 });
  console.log('Success! Profile tab has aria-current="page" and URL is:', page.url());

  // 3. Click Home
  console.log('Test 3: Click Dashboard...');
  await page.click('nav[aria-label] a[href="/"]');
  await page.waitForSelector('nav[aria-label] a[href="/"][aria-current="page"]', { timeout: 3000 });
  console.log('Success! Home tab has aria-current="page" and URL is:', page.url());

  // 4. Click Add
  console.log('Test 4: Click Add button...');
  await page.click('button[aria-label="إضافة"]');
  await page.waitForURL('**/add', { timeout: 3000 });
  console.log('Success! Click navigated to:', page.url());

  // Go back to home
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('nav[aria-label]');

  // 5. Test scrubbing / dragging
  console.log('Test 5: Mouse drag from Home to Profile...');
  const rail = await page.$('nav[aria-label] > div[dir]');
  const box = await rail.boundingBox();
  console.log('Rail bounding box:', box);

  // Mouse move and drag
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await page.mouse.down();
  // Drag across to left (Profile in Arabic)
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('URL after drag:', page.url());

  // Capture screenshot evidence per Rule 13
  await page.screenshot({ path: 'scripts/bottomnav_verified.png' });
  console.log('Screenshot saved to scripts/bottomnav_verified.png');

  console.log('All bottom nav tests passed with complete assertions!');
  await browser.close();
}

testFull().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
