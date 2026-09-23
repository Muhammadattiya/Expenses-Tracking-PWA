import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE_URL + path, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function put(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('===============================================================');
  console.log('🚀 VALIDATING 5 QUICKSTART SCENARIOS (002-financial-resilience)');
  console.log('===============================================================\n');

  // Authenticate
  const loginRes = await post('/api/auth/login', { email: 'gemini@gmail.com', password: '123456789' });
  const cookies = loginRes.headers['set-cookie'];
  const jwtCookie = cookies ? cookies.find(c => c.startsWith('jwt=')) : null;
  const cookieHeader = jwtCookie ? jwtCookie.split(';')[0] : '';
  const headers = { Cookie: cookieHeader };

  // Fetch Accounts to get default checking account
  const accRes = await get('/api/accounts', headers);
  const checkingAcc = accRes.data?.[0];
  console.log('✓ Authenticated. Default account:', checkingAcc?.name, `(${checkingAcc?._id})`);

  // --------------------------------------------------------------------------
  // Scenario 1: Structured Installment Lifecycle & DTI Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Structured Installment Lifecycle & DTI ---');
  const createInstRes = await post('/api/installments', {
    title: 'iPhone 15 ValU',
    provider: 'valu',
    totalAmount: 36000,
    downPayment: 6000,
    monthlyAmount: 2500,
    totalMonths: 12,
    dueDayOfMonth: 5,
    linkedAccountId: checkingAcc?._id
  }, headers);

  if (createInstRes.status !== 201 && createInstRes.status !== 200) {
    throw new Error(`Scenario 1 Failed to create installment: ${JSON.stringify(createInstRes.data)}`);
  }
  const installment = createInstRes.data.data;
  console.log(`✓ Created Installment: ${installment.title}, Monthly: ${installment.monthlyAmount} EGP, Paid: ${installment.paidMonths}/${installment.totalMonths}`);

  // Pay single installment
  const payRes = await post(`/api/installments/${installment._id}/pay`, { accountId: checkingAcc?._id }, headers);
  if (payRes.status !== 200) {
    throw new Error(`Scenario 1 Failed to pay installment: ${JSON.stringify(payRes.data)}`);
  }
  const updatedInst = payRes.data.data.installment;
  console.log(`✓ Payment Logged: Progress is now ${updatedInst.paidMonths} of ${updatedInst.totalMonths}, Remaining: ${updatedInst.remainingBalance} EGP`);
  console.log('👉 Scenario 1 Passed Successfully!');

  // --------------------------------------------------------------------------
  // Scenario 2: Emergency Fund Shield & Dynamic Burn Rate
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Emergency Fund Shield & Dynamic Burn Rate ---');
  let emergencyAcc = accRes.data?.find(a => String(a._id) !== String(checkingAcc._id));
  if (!emergencyAcc) {
    const newAccRes = await post('/api/accounts', {
      name: 'صندوق الطوارئ المحمي',
      type: 'bank',
      balance: 0,
      isEmergencyFund: true
    }, headers);
    emergencyAcc = newAccRes.data;
  }
  console.log('✓ Emergency vault account:', emergencyAcc.name, `(${emergencyAcc._id})`);

  // Configure Shield with the dedicated emergency vault
  await put('/api/emergency-fund', { targetMonths: 6, linkedAccountId: emergencyAcc._id }, headers);
  const shieldRes = await get('/api/emergency-fund', headers);
  const shield = shieldRes.data.data;
  console.log(`✓ Essential Monthly Burn: ${shield.essentialMonthlyBurn} EGP (Bills + Recurring + Installments)`);
  console.log(`✓ Target Reserve (6 months): ${shield.targetAmount} EGP, Initial Tier: ${shield.protectionTier}`);

  // Deposit 10,000 from Checking into the Emergency Shield Vault
  const depositRes = await post('/api/emergency-fund/deposit', {
    amount: 10000,
    fromAccountId: checkingAcc?._id
  }, headers);
  if (depositRes.status !== 200) {
    throw new Error(`Scenario 2 Failed to deposit to shield: ${JSON.stringify(depositRes.data)}`);
  }
  const updatedShield = depositRes.data.data.shield;
  console.log(`✓ Deposited 10,000 EGP to Shield: Current Reserve is ${updatedShield.currentReserveAmount} EGP, Funding Ratio: ${updatedShield.fundingRatio}%`);
  console.log('👉 Scenario 2 Passed Successfully!');

  // --------------------------------------------------------------------------
  // Scenario 3: Smart Savings Goals & Milestone Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Smart Savings Goals & Milestone Tracking ---');
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + 10);

  const goalRes = await post('/api/savings-goals', {
    title: 'مقدم سيارة',
    category: 'car',
    targetAmount: 60000,
    targetDate: targetDate.toISOString(),
    priority: 'high',
    allocationType: 'virtual_jar',
    linkedAccountId: checkingAcc?._id
  }, headers);

  if (goalRes.status !== 201 && goalRes.status !== 200) {
    throw new Error(`Scenario 3 Failed to create savings goal: ${JSON.stringify(goalRes.data)}`);
  }
  const goal = goalRes.data.data;
  console.log(`✓ Created Goal: "${goal.title}", Target: ${goal.targetAmount} EGP, Required Pace: ${goal.requiredMonthlyPace} EGP/month`);

  // Contribute 15,000 (25% milestone)
  const contributeRes = await post(`/api/savings-goals/${goal._id}/contribute`, {
    amount: 15000,
    fromAccountId: checkingAcc?._id
  }, headers);
  if (contributeRes.status !== 200) {
    throw new Error(`Scenario 3 Failed to contribute to goal: ${JSON.stringify(contributeRes.data)}`);
  }
  const updatedGoal = contributeRes.data.data.goal;
  console.log(`✓ Deposited 15,000 EGP (25%): Current Saved is ${updatedGoal.currentAmount} EGP (${Math.round((updatedGoal.currentAmount / updatedGoal.targetAmount) * 100)}%), Status: ${updatedGoal.paceHealth}`);
  console.log('👉 Scenario 3 Passed Successfully!');

  // --------------------------------------------------------------------------
  // Scenario 4: Financial Sandbox Multi-Month Simulation & Verdict
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Sandbox Multi-Month Trajectory & Verdict ---');
  const simActions = [{
    type: 'purchase',
    payload: {
      amount: 40000,
      accountId: checkingAcc?._id,
      notes: 'شراء كاش كبير (40 ألف)'
    }
  }];

  const simRes = await post('/api/sandbox/run', {
    actions: simActions,
    horizonMonths: 6
  }, headers);

  if (simRes.status !== 200) {
    throw new Error(`Scenario 4 Failed to run simulation: ${JSON.stringify(simRes.data)}`);
  }
  const sim = simRes.data.data;
  console.log(`✓ Multi-Month Trajectory Generated: ${sim.projection?.monthlyPoints?.length} months projected`);
  console.log(`✓ Safety Floor: ${sim.projection?.safetyFloor} EGP, Breached: ${sim.projection?.breachedFloor ? 'YES ⚠️' : 'NO'}`);
  console.log(`✓ Verdict: ${sim.decision?.verdict?.badgeAr} - "${sim.decision?.verdict?.reasonAr}"`);
  console.log(`✓ Recovery Runway: ${sim.decision?.recoveryDays} days (${sim.decision?.recoveryDaysTextAr})`);
  console.log('👉 Scenario 4 Passed Successfully!');

  // --------------------------------------------------------------------------
  // Scenario 5: "Commit to Reality" Execution
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: "Commit to Reality" Execution Bridge ---');
  const commitActions = [{
    type: 'installment',
    payload: {
      title: 'تقسيط غسالة وثلاجة (مطبق من المحاكاة)',
      provider: 'valu',
      totalAmount: 24000,
      downPayment: 4000,
      monthlyAmount: 2000,
      totalMonths: 10,
      dueDayOfMonth: 10,
      linkedAccountId: checkingAcc?._id
    }
  }];

  const applyRes = await post('/api/sandbox/apply', {
    actions: commitActions
  }, headers);

  if (applyRes.status !== 200) {
    throw new Error(`Scenario 5 Failed to commit simulation: ${JSON.stringify(applyRes.data)}`);
  }
  console.log(`✓ Atomically applied simulation pipeline:`, applyRes.data.data?.summary);
  console.log('👉 Scenario 5 Passed Successfully!');

  console.log('\n===============================================================');
  console.log('🎉 ALL 5 QUICKSTART SCENARIOS VALIDATED WITH 100% PASS RATE!');
  console.log('===============================================================');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ QUICKSTART VALIDATION FAILED:', err);
  process.exit(1);
});
