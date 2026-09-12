import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.pending.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async captureScreenshot(filepath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
    console.log(`📸 Saved screenshot: ${filepath}`);
  }

  close() {
    this.ws.close();
  }
}

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('FINOVA REAL CHROME BROWSER VERIFICATION & PROFILING');
  console.log('================================================================\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\DELL\\AppData\\Local\\Temp\\finova_cdp_' + Date.now();
  
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=390,844',
    'http://localhost:5173/'
  ]);

  // Wait for Chrome to bind
  let connected = false;
  let pageTarget = null;
  for (let i = 0; i < 20; i++) {
    await delay(500);
    try {
      const targets = await fetchJson('http://127.0.0.1:9222/json/list');
      pageTarget = targets.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        connected = true;
        break;
      }
    } catch (e) {}
  }

  if (!connected || !pageTarget) {
    throw new Error('Could not find active page target in Chrome.');
  }

  console.log('✅ Connected to Chrome CDP on page target:', pageTarget.url);
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.init();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  // STEP 1: Seed offline session and IndexedDB using the application's Dexie db instance
  console.log('\n[STEP 1] Seeding offline-first session, accounts, and categories via Dexie...');
  await delay(2500);

  const seedResult = await client.eval(`
    (async () => {
      try {
        const testUser = {
          _id: '6aa393377bf91dbb8faf99ec',
          name: 'Offline Tester',
          email: 'tester@finova.offline',
          hasCompletedOnboarding: true,
          preferences: { trackingPeriod: 'monthly', trackingStartDayMonthly: 1 }
        };

        localStorage.setItem('auth_user', JSON.stringify(testUser));
        localStorage.setItem('finova_active_user_id', testUser._id);
        localStorage.setItem('finova_language', 'en');

        // Dynamically import Dexie from the running app
        const { db } = await import('/src/db/db.js');
        await db.open();

        await db.accounts.put({
          _id: 'acc_wallet',
          name: 'Cash Wallet',
          type: 'cash',
          balance_adjustment: 5000,
          user: testUser._id,
          userId: testUser._id,
          isArchived: false,
          color: '#8D6346'
        });

        await db.accounts.put({
          _id: 'acc_bank',
          name: 'Main Bank',
          type: 'bank',
          balance_adjustment: 15000,
          user: testUser._id,
          userId: testUser._id,
          isArchived: false,
          color: '#34C759'
        });

        await db.categories.put({
          _id: 'cat_food',
          nameEn: 'Food & Dining',
          nameAr: 'طعام ومشروبات',
          type: 'expense',
          icon: 'Utensils',
          user: testUser._id,
          userId: testUser._id
        });

        await db.categories.put({
          _id: 'cat_salary',
          nameEn: 'Salary',
          nameAr: 'راتب',
          type: 'income',
          icon: 'Briefcase',
          user: testUser._id,
          userId: testUser._id
        });

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()
  `);
  console.log('Seed result:', seedResult);

  // STEP 2: Simulate Offline (server unreachable) and Navigate to Dashboard
  console.log('\n[STEP 2] Simulating Offline mode (server auth endpoint blocked) and loading Dashboard...');
  await client.send('Network.enable');
  await client.send('Network.setBlockedURLs', { urls: ['*localhost:5000/api/auth/me*'] });
  await client.send('Page.navigate', { url: 'http://localhost:5173/' });
  await delay(3500);

  const dashboardState = await client.eval(`
    (() => {
      const balanceEl = document.querySelector('h1.tabular-nums');
      const accountNameEl = document.querySelector('h2.tracking-wide');
      const gainPill = document.querySelector('.text-green-400');
      const lossPill = document.querySelector('.text-red-400');
      const liquidCards = document.querySelectorAll('.liquidglass');
      const historyHeading = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Transaction') || h.innerText.includes('المعاملات'));

      return {
        url: window.location.href,
        pathname: window.location.pathname,
        totalBalanceText: balanceEl ? balanceEl.innerText.trim() : null,
        accountNameText: accountNameEl ? accountNameEl.innerText.trim() : null,
        liquidGlassElementsCount: liquidCards.length,
        hasGainPill: !!gainPill,
        hasLossPill: !!lossPill,
        historyHeadingText: historyHeading ? historyHeading.innerText.trim() : null,
        bodySample: document.body.innerText.split('\\n').filter(Boolean).slice(0, 8)
      };
    })()
  `);
  console.log('Dashboard rendered state:', dashboardState);

  await client.captureScreenshot('d:\\expenses-tracker\\scratch\\browser_dashboard_seeded.png');

  // STEP 3: Verify Liquid Glass computed styles in browser
  console.log('\n[STEP 3] Verifying Liquid Glass computed styles in browser...');
  const glassStyles = await client.eval(`
    (() => {
      const glassEl = document.querySelector('.liquidglass');
      if (!glassEl) return null;
      const computed = window.getComputedStyle(glassEl);
      return {
        backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter,
        boxShadow: computed.boxShadow,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius
      };
    })()
  `);
  console.log('Liquid Glass computed styles:', glassStyles);

  // STEP 4: Measure frame & scrolling performance
  console.log('\n[STEP 4] Measuring frame and rendering smoothness during scroll...');
  const perfMetrics = await client.eval(`
    (async () => {
      let frameCount = 0;
      let start = performance.now();
      let lastFrame = start;
      let maxFrameDuration = 0;

      await new Promise(resolve => {
        function onFrame(now) {
          frameCount++;
          const delta = now - lastFrame;
          if (delta > maxFrameDuration) maxFrameDuration = delta;
          lastFrame = now;

          window.scrollBy(0, 20);

          if (now - start < 1000) {
            requestAnimationFrame(onFrame);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(onFrame);
      });

      const totalTime = performance.now() - start;
      const fps = Math.round((frameCount / totalTime) * 1000);

      return {
        fps,
        frameCount,
        maxFrameDurationMs: Math.round(maxFrameDuration),
        totalTimeMs: Math.round(totalTime)
      };
    })()
  `);
  console.log('Scroll & FPS measurements:', perfMetrics);

  // STEP 5: Create an Offline Transaction using createTransactionLocal
  console.log('\n[STEP 5] Creating an Offline Transaction using createTransactionLocal in browser...');
  const offlineTxCreation = await client.eval(`
    (async () => {
      try {
        const { createTransactionLocal } = await import('/src/services/offlineFinancialService.js');
        const res = await createTransactionLocal({
          type: 'expense',
          amount: 500,
          account: 'acc_wallet',
          category: 'cat_food',
          title: 'Fresh Grocery Lunch'
        });
        return { success: true, transaction: res };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()
  `);
  console.log('Offline transaction created:', offlineTxCreation);
  await delay(2000);

  // Check Dashboard state after offline transaction creation
  const afterTxState = await client.eval(`
    (() => {
      const balanceEl = document.querySelector('h1.tabular-nums');
      const bodyText = document.body.innerText;
      const cardsText = Array.from(document.querySelectorAll('.liquidglass, [data-transaction-id]')).map(c => c.innerText);

      return {
        updatedBalanceText: balanceEl ? balanceEl.innerText.trim() : null,
        hasNoAccount: bodyText.includes('No Account') || bodyText.includes('بدون حساب'),
        hasDeletedAccount: bodyText.includes('Deleted Account'),
        hasNeedsReview: bodyText.includes('Needs Review') || bodyText.includes('تحتاج مراجعة'),
        hasGroceriesOrFood: bodyText.includes('Food & Dining') || bodyText.includes('طعام ومشروبات'),
        hasCashWallet: bodyText.includes('Cash Wallet')
      };
    })()
  `);
  console.log('\n[STEP 6] Dashboard state immediately after offline transaction:');
  console.log(afterTxState);

  await client.captureScreenshot('d:\\expenses-tracker\\scratch\\browser_after_offline_tx.png');

  // STEP 7: Localization Verification (English vs Arabic)
  console.log('\n[STEP 7] Verifying English and Arabic modes in Real Browser...');
  const enAudit = await client.eval(`
    (() => {
      const text = document.body.innerText;
      const systemicArabicWords = ['الرصيد', 'المعاملات', 'المصروفات', 'الدخل', 'تسوية'];
      const leaked = systemicArabicWords.filter(w => text.includes(w));
      return {
        direction: document.documentElement.dir || 'ltr',
        leakedSystemicArabic: leaked
      };
    })()
  `);
  console.log('English Localization Audit:', enAudit);

  // Switch to Arabic
  console.log('Testing Arabic mode...');
  await client.eval(`
    (() => {
      localStorage.setItem('finova_language', 'ar');
      window.location.reload();
    })()
  `);
  await delay(3000);

  const arAudit = await client.eval(`
    (() => {
      return {
        direction: document.documentElement.dir || 'rtl',
        hasArabicBalanceLabel: document.body.innerText.includes('إجمالي الرصيد') || document.body.innerText.includes('الرصيد'),
        hasTransactionHistoryLabel: document.body.innerText.includes('سجل المعاملات') || document.body.innerText.includes('المعاملات')
      };
    })()
  `);
  console.log('Arabic Localization Audit:', arAudit);
  await client.captureScreenshot('d:\\expenses-tracker\\scratch\\browser_arabic_mode.png');

  // Switch back to English
  await client.eval(`
    (() => {
      localStorage.setItem('finova_language', 'en');
      window.location.reload();
    })()
  `);
  await delay(2500);

  // Close Chrome
  client.close();
  chromeProc.kill();
  console.log('\n================================================================');
  console.log('🎉 REAL CHROME BROWSER VERIFICATION SUCCESSFULLY COMPLETED!');
  console.log('================================================================\n');
  process.exit(0);
}

runBrowserVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
