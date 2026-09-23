import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/DELL/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log(msg.text()));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'gemini@gmail.com');
  await page.fill('input[type="password"]', '123456789');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

  const balances = await page.evaluate(async () => {
    const opts = { credentials: 'include' };

    const [accsRes, txsRes, debtsRes, instsRes, recsRes] = await Promise.all([
      fetch('http://localhost:5000/api/accounts', opts).then(r => r.json()),
      fetch('http://localhost:5000/api/transactions?limit=1000', opts).then(r => r.json()),
      fetch('http://localhost:5000/api/debts', opts).then(r => r.json()).catch(() => ({ debts: [], transactions: [] })),
      fetch('http://localhost:5000/api/installments', opts).then(r => r.json()).catch(() => ({ installments: [], transactions: [] })),
      fetch('http://localhost:5000/api/receivables', opts).then(r => r.json()).catch(() => [])
    ]);

    const accounts = accsRes || [];
    console.log('[BROWSER] txsRes keys:', Object.keys(txsRes || {}));
    console.log('[BROWSER] txsRes count:', Array.isArray(txsRes) ? txsRes.length : (txsRes.data?.length || txsRes.transactions?.length));
    const transactions = Array.isArray(txsRes) ? txsRes : (txsRes.data || txsRes.transactions || []);
    const debtTxs = debtsRes.transactions || debtsRes.data || [];
    const instTxs = instsRes.transactions || instsRes.data || [];
    const receivables = Array.isArray(recsRes) ? recsRes : (recsRes.data || recsRes.receivables || []);

    return accounts.map(acc => {
      const accId = acc._id.toString();

      // Current PlansTab logic:
      let plansTabBal = Number(acc.balance_adjustment) || 0;
      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        const tAcc = (t.account?._id || t.account)?.toString();
        const tFrom = (t.from_account?._id || t.from_account)?.toString();
        const tTo = (t.to_account?._id || t.to_account)?.toString();
        if (t.type === 'income' || t.type === 'settlement') {
          if (tAcc === accId) plansTabBal += amt;
        } else if (t.type === 'expense') {
          if (tAcc === accId) plansTabBal -= amt;
        } else if (t.type === 'transfer') {
          if (tFrom === accId) plansTabBal -= amt;
          if (tTo === accId) plansTabBal += amt;
        }
      });

      // Complete authoritative AccountManagement / Dashboard logic:
      let fullBal = Number(acc.balance_adjustment) || 0;
      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        const tAcc = (t.account?._id || t.account)?.toString();
        const tFrom = (t.from_account?._id || t.from_account)?.toString();
        const tTo = (t.to_account?._id || t.to_account)?.toString();
        if (t.type === 'income' || t.type === 'settlement') {
          if (tAcc === accId) fullBal += amt;
        } else if (t.type === 'expense') {
          if (tAcc === accId) fullBal -= amt;
        } else if (t.type === 'transfer') {
          if (tFrom === accId) fullBal -= amt;
          if (tTo === accId) fullBal += amt;
        }
      });
      debtTxs.forEach(dt => {
        const dtAccId = (dt.account?._id || dt.account)?.toString();
        if (dtAccId === accId) {
          if (dt.type === 'loan') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') fullBal += dt.amount;
            else fullBal -= dt.amount;
          } else if (dt.type === 'repayment') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') fullBal -= dt.amount;
            else fullBal += dt.amount;
          }
        }
      });
      instTxs.forEach(it => {
        const itAccId = (it.account?._id || it.account)?.toString();
        if (itAccId === accId) {
          fullBal -= (Number(it.amount) || 0);
        }
      });
      receivables.forEach(r => {
        const paidFromId = (r.paidFrom?._id || r.paidFrom)?.toString();
        const recToId = (r.receivedTo?._id || r.receivedTo)?.toString();
        if (paidFromId === accId) fullBal -= r.paidAmount;
        if (recToId === accId) fullBal += r.receivedAmount;
        if (r.participants) {
          r.participants.forEach(p => {
            if (p.payments) {
              p.payments.forEach(pay => {
                const payAccId = (pay.account?._id || pay.account)?.toString();
                if (payAccId === accId) fullBal += pay.amount;
              });
            }
          });
        }
      });

      return {
        name: acc.name,
        type: acc.type,
        isSavingsAccount: acc.isSavingsAccount,
        isEmergencyFund: acc.isEmergencyFund,
        balance_adjustment: acc.balance_adjustment,
        plansTabBal,
        plansTabMathMax: Math.max(0, plansTabBal),
        fullBal
      };
    });
  });

  console.log('[DEBUG] Calculated Account Balances:');
  console.table(balances);

  await browser.close();
}

run();
