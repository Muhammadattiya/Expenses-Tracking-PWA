import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');

const OUT = path.resolve('D:/expenses-tracker/.impeccable/tmp-assessment-b');
fs.mkdirSync(OUT, { recursive: true });

const detectPort = process.env.DETECT_PORT || '';
const phase = process.env.PHASE || 'all'; // preflight | capture | all

function collectConsole(page, bucket) {
  page.on('console', (msg) => {
    bucket.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });
  page.on('pageerror', (err) => {
    bucket.push({ type: 'pageerror', text: String(err) });
  });
}

async function dumpState(page, label) {
  const state = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a, nav')).slice(0, 40).map((el) => ({
      tag: el.tagName,
      aria: el.getAttribute('aria-label'),
      expanded: el.getAttribute('aria-expanded'),
      text: (el.textContent || '').trim().slice(0, 80),
    }));
    return {
      url: location.href,
      title: document.title,
      buttons,
      bodyText: (document.body && document.body.innerText ? document.body.innerText : '').slice(0, 500),
    };
  });
  console.log('STATE ' + label + ' ' + JSON.stringify(state));
  return state;
}

async function login(page) {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  if (page.url().includes('/welcome')) {
    const loginLink = page.locator('a[href="/login"]');
    if (await loginLink.count()) {
      await loginLink.first().click();
      await page.waitForTimeout(800);
    }
  }
  const email = page.locator('input[type="email"]');
  if (await email.count()) {
    await email.first().fill('gemini@gmail.com');
    await page.locator('input[type="password"]').first().fill('123456789');
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.locator('button[type="submit"]').first().click(),
    ]).catch(() => {});
    await page.waitForTimeout(3000);
  }
  if (page.url().includes('/onboarding')) {
    const skip = page.getByRole('button', { name: /skip|continue|get started|done|next/i });
    if (await skip.count()) {
      await skip.first().click();
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForSelector('button[aria-label="Open menu"], button[aria-label="Close menu"], nav', { timeout: 20000 }).catch(() => {});
}

async function preflight(page) {
  return page.evaluate(() => {
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
}

async function injectDetect(page, port) {
  return page.evaluate((p) => {
    return new Promise((resolve) => {
      const existing = document.querySelector('script[data-impeccable-detect="1"]');
      if (existing) {
        resolve({ injected: true, already: true });
        return;
      }
      const s = document.createElement('script');
      s.src = `http://localhost:${p}/detect.js`;
      s.setAttribute('data-impeccable-detect', '1');
      s.onload = () => resolve({ injected: true, already: false, src: s.src });
      s.onerror = () => resolve({ injected: false, error: 'script error', src: s.src });
      document.documentElement.appendChild(s);
      setTimeout(() => resolve({ injected: false, error: 'timeout waiting for detect.js load', src: s.src }), 30000);
    });
  }, port);
}

function plusButton(page) {
  return page.locator('button[aria-label="Open menu"], button[aria-label="Close menu"]').first();
}

async function openPlus(page) {
  const plus = plusButton(page);
  if (!(await plus.count())) throw new Error('plus button not found');
  const expanded = await plus.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await plus.click();
    await page.waitForTimeout(700);
  }
}

async function closePlus(page) {
  const plus = plusButton(page);
  if (!(await plus.count())) return;
  const expanded = await plus.getAttribute('aria-expanded');
  if (expanded === 'true') {
    await plus.click();
    await page.waitForTimeout(400);
  }
}

const consoleLogs = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
collectConsole(page, consoleLogs);

try {
  await login(page);
  await dumpState(page, 'after-login');
  const pf = await preflight(page);
  fs.writeFileSync(path.join(OUT, 'preflight.json'), JSON.stringify(pf, null, 2));
  console.log('PREFLIGHT ' + JSON.stringify(pf));

  if (phase === 'preflight') {
    process.exitCode = pf.mutation ? 0 : 3;
    await browser.close();
    process.exit();
  }

  let injectResult = { skipped: true, reason: 'no DETECT_PORT or mutation false' };
  if (pf.mutation && detectPort) {
    injectResult = await injectDetect(page, detectPort);
    await page.waitForTimeout(2800);
  } else if (!pf.mutation) {
    injectResult = { skipped: true, reason: 'mutation unavailable' };
  } else {
    injectResult = { skipped: true, reason: 'DETECT_PORT empty' };
  }
  fs.writeFileSync(path.join(OUT, 'inject.json'), JSON.stringify(injectResult, null, 2));
  console.log('INJECT ' + JSON.stringify(injectResult));

  const shots = [];
  const viewports = [
    { name: '390', width: 390, height: 844 },
    { name: '1280', width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);
    try { await closePlus(page); } catch (e) { console.log('CLOSEPLUS ' + e.message); }
    const restPath = path.join(OUT, `nav-rest-${vp.name}.png`);
    await page.screenshot({ path: restPath, fullPage: false });
    shots.push(restPath);

    try {
      await openPlus(page);
    } catch (e) {
      console.log('OPENPLUS ' + e.message);
    }
    const plusPath = path.join(OUT, `nav-plus-${vp.name}.png`);
    await page.screenshot({ path: plusPath, fullPage: false });
    shots.push(plusPath);
    try { await closePlus(page); } catch (e) { console.log('CLOSEPLUS ' + e.message); }
  }

  const impeccableLogs = consoleLogs.filter((l) =>
    /impeccable/i.test(l.text || '')
  );
  const result = {
    url: page.url(),
    preflight: pf,
    inject: injectResult,
    screenshots: shots,
    consoleCount: consoleLogs.length,
    impeccableConsole: impeccableLogs,
    consoleSample: consoleLogs.slice(-40),
  };
  fs.writeFileSync(path.join(OUT, 'capture.json'), JSON.stringify(result, null, 2));
  console.log('CAPTURE ' + JSON.stringify({ screenshots: shots, inject: injectResult, impeccableConsole: impeccableLogs.length, consoleCount: consoleLogs.length }));
} catch (err) {
  console.error('FAILED ' + (err && err.stack ? err.stack : String(err)));
  process.exitCode = 1;
} finally {
  await browser.close();
}
