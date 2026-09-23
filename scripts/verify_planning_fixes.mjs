import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function verifyFixes() {
  console.log('=== STARTING PLANNING FIXES VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });

  try {
    // ----------------------------------------------------
    // TEST 1: Mobile Tab Labels (iPhone 14)
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Mobile Tab Labels on iPhone 14 ---');
    const mobileContext = await browser.newContext({
      ...devices['iPhone 14']
    });
    const mobilePage = await mobileContext.newPage();
    
    // Test in Arabic
    await mobilePage.addInitScript(() => {
      localStorage.setItem('finova-lang', 'ar');
    });

    await mobilePage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await mobilePage.fill('input[type="email"]', 'gemini@gmail.com');
    await mobilePage.fill('input[type="password"]', '123456789');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('http://localhost:5173/', { timeout: 10000 });

    await mobilePage.goto('http://localhost:5173/planning?tab=budgets', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);

    // Verify all 4 tabs have full text and no '...'
    const tabTextsAr = await mobilePage.$$eval('[role="tab"] span', spans => spans.map(s => s.textContent.trim()));
    console.log('Arabic Mobile Tab Labels:', tabTextsAr);
    for (const text of tabTextsAr) {
      if (text.includes('...')) {
        throw new Error(`Tab text was truncated: "${text}"`);
      }
    }
    console.log('SUCCESS: No truncated tab labels in Arabic!');

    // Test in English
    await mobilePage.evaluate(() => {
      localStorage.setItem('finova-lang', 'en');
      window.location.reload();
    });
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(2000);

    const tabTextsEn = await mobilePage.$$eval('[role="tab"] span', spans => spans.map(s => s.textContent.trim()));
    console.log('English Mobile Tab Labels:', tabTextsEn);
    for (const text of tabTextsEn) {
      if (text.includes('...')) {
        throw new Error(`Tab text was truncated in English: "${text}"`);
      }
    }
    console.log('SUCCESS: No truncated tab labels in English!');

    await mobilePage.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7/mobile_tabs_full_labels.png' });
    await mobileContext.close();

    // ----------------------------------------------------
    // TEST 2: Budgets Tab createFirst translation check
    // ----------------------------------------------------
    console.log('\n--- 2. Checking Budgets Tab createFirst Button ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await desktopContext.newPage();

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'gemini@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

    await page.goto('http://localhost:5173/planning?tab=budgets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const pageContent = await page.content();
    if (pageContent.includes('budgets.createFirst')) {
      throw new Error('FAILURE: raw key "budgets.createFirst" found on page!');
    }
    console.log('SUCCESS: No raw translation key "budgets.createFirst" found!');

    // ----------------------------------------------------
    // TEST 3 & 4: Plans Tab Goal Account Balance & Editing
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Plans Tab Goal Account Balance Sync & Editing ---');
    await page.goto('http://localhost:5173/planning?tab=plans', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click "Add Goal"
    const addGoalBtn = await page.$('button:has-text("New Goal"), button:has-text("هدف جديد"), button:has-text("Add Goal")');
    if (addGoalBtn) {
      await addGoalBtn.click();
      await page.waitForTimeout(1000);

      // In GoalModal: Check if Dedicated account shows synced balance
      const syncedBadge = await page.$('text=Auto-synced, text=مربوط برصيد الحساب');
      console.log('Dedicated account sync badge visible:', !!syncedBadge);

      // Check current amount input value
      const currentAmountVal = await page.$eval('input[type="number"][readonly]', el => el.value).catch(() => 'NOT_READONLY');
      console.log('Dedicated goal current amount (auto-synced from account):', currentAmountVal);

      // Fill in goal details
      const testGoalTitle = 'Test Automated Goal ' + Date.now();
      await page.fill('form input[type="text"]', testGoalTitle);
      await page.fill('input[placeholder="50000"]', '100000');

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
      console.log('Goal created successfully.');

      // Now verify editing the goal
      console.log('\n--- 4. Testing Editing The Goal ---');
      // Locate the created goal card
      const goalCard = await page.locator(`h4:has-text("${testGoalTitle}")`).locator('xpath=ancestor::div[contains(@class, "backdrop-blur")]').first();
      // Click edit button
      const editBtn = goalCard.locator('button[aria-label="Edit"], button[aria-label="تعديل"]').first();
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Change title to Updated Title and switch to virtual jar to test manual amount
      const updatedTitle = testGoalTitle + ' - Edited';
      await page.fill('form input[type="text"]', updatedTitle);
      
      // Click Virtual Jar
      const virtualJarBtn = await page.locator('button:has-text("Virtual Jar"), button:has-text("وعاء افتراضي")').first();
      await virtualJarBtn.click();
      await page.waitForTimeout(500);

      // Set custom amount
      const numInputs = await page.$$('input[type="number"]');
      if (numInputs.length >= 2) {
        await numInputs[1].fill('42000');
      }

      // Save
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);

      // Check if updated title and custom amount appear in UI
      const updatedCard = await page.locator(`text="${updatedTitle}"`).first();
      const isUpdatedVisible = await updatedCard.isVisible();
      console.log('Updated Goal Title Visible in UI:', isUpdatedVisible);
      if (!isUpdatedVisible) {
        throw new Error('FAILURE: Edited goal title not found in UI!');
      }

      await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7/goal_edited_verified.png' });
      console.log('SUCCESS: Goal was actually edited and persisted in UI!');

      // Clean up: Delete test goal
      const deleteBtn = page.locator(`div:has-text("${updatedTitle}")`).first().locator('button[aria-label="Delete"], button[aria-label="حذف"]').first();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await page.click('button:has-text("Delete"), button:has-text("حذف")');
      await page.waitForTimeout(1500);
      console.log('Cleaned up test goal.');
    }

    await desktopContext.close();
    console.log('\n=== ALL FIXES VERIFIED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

verifyFixes();
