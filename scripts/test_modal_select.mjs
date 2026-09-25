import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/c687b85c-a621-4b18-a99e-7acb13531eb5';

async function testBudgetModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  await page.goto('http://localhost:5173/sandbox', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click "تعديل ميزانية"
  const budgetBtn = await page.$('button:has-text("تعديل ميزانية")');
  if (budgetBtn) {
    await budgetBtn.click();
    await page.waitForTimeout(500);

    // Click the Action dropdown (CustomSelect)
    const selectTrigger = await page.$('button:has-text("اختر الإجراء...")');
    if (selectTrigger) {
      await selectTrigger.click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sandbox_desktop_ar_modal_budget_custom_select.png') });
    console.log('Captured sandbox_desktop_ar_modal_budget_custom_select.png');
  }

  await browser.close();
}

testBudgetModal().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
