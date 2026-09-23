import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/6bfeb3cf-fc2e-4d25-b5fe-e7c09f9e47a7';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('finova-lang', 'ar');
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');

  // Emergency Tab fullpage
  await page.goto('http://localhost:5173/planning?tab=emergency', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab3_emergency_desktop_ar.png'), fullPage: true });

  // Plans Tab fullpage
  await page.goto('http://localhost:5173/planning?tab=plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_tab4_plans_desktop_ar.png'), fullPage: true });

  // Goal Modal
  const newGoalBtn = page.getByRole('button', { name: /هدف جديد|New Goal/i }).first();
  if (await newGoalBtn.isVisible()) {
    await newGoalBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'planning_goal_modal_desktop_ar.png'), fullPage: false });
  }

  await browser.close();
  console.log('✅ Captured full screenshots successfully!');
}

capture();
