import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('D:/expenses-tracker/.impeccable/tmp-assessment-b');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(800);

const email = page.locator('input[type="email"]');
if (await email.count()) {
  await email.first().fill('gemini@gmail.com');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

const preflight = await page.evaluate(() => {
  const original = document.title;
  document.title = '__impeccable_preflight__';
  const titleOk = document.title === '__impeccable_preflight__';
  document.title = original;
  const s = document.createElement('script');
  s.setAttribute('data-impeccable-preflight', '1');
  document.documentElement.appendChild(s);
  const scriptOk = !!document.querySelector('script[data-impeccable-preflight="1"]');
  s.remove();
  return {
    titleOk,
    scriptOk,
    mutation: titleOk && scriptOk,
    url: location.href,
    title: document.title,
  };
});

fs.writeFileSync(path.join(OUT, 'preflight.json'), JSON.stringify(preflight, null, 2));
console.log(JSON.stringify(preflight, null, 2));
await browser.close();
