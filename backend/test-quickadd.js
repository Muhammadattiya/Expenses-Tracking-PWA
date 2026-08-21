const { parseText } = require('./services/quickAdd/nlpParser');

const mockAccounts = [
  { _id: 'acc1', name: 'كاش' },
  { _id: 'acc2', name: 'المحفظة' },
  { _id: 'acc3', name: 'البنك' },
  { _id: 'acc4', name: 'Cash' },
  { _id: 'acc5', name: 'Wallet' },
  { _id: 'acc6', name: 'Bank' },
  { _id: 'acc7', name: 'kash' },
  { _id: 'acc8', name: 'm7fza' },
  { _id: 'acc9', name: 'bank' },
  { _id: 'acc10', name: 'حساب البنك' },
];

const tests = [
  // Existing Tests
  { input: 'اشتريت قهوة بـ50', expectAmount: 50, expectIntent: 'coffee', expectDate: 'today', expectDesc: 'قهوة', expectAccount: null },
  { input: 'دفعت 200 في مطعم', expectAmount: 200, expectIntent: 'restaurant', expectDate: 'today', expectDesc: 'مطعم', expectAccount: null },
  { input: 'جبت أكل بـ100', expectAmount: 100, expectIntent: 'food_and_drink', expectDate: 'today', expectDesc: 'أكل', expectAccount: null },
  { input: 'دفعت في كافيه 120', expectAmount: 120, expectIntent: 'coffee', expectDate: 'today', expectDesc: 'كافيه', expectAccount: null },
  { input: 'اشتريت بيتزا بـ250', expectAmount: 250, expectIntent: 'fast_food', expectDate: 'today', expectDesc: 'بيتزا', expectAccount: null },
  { input: 'دفعت في KFC 200', expectAmount: 200, expectIntent: 'fast_food', expectDate: 'today', expectDesc: 'KFC', expectAccount: null },
  { input: 'دفعت في Starbucks 100', expectAmount: 100, expectIntent: 'coffee', expectDate: 'today', expectDesc: 'Starbucks', expectAccount: null },
  { input: 'ركبت تاكسي بـ100', expectAmount: 100, expectIntent: 'transportation', expectDate: 'today', expectDesc: 'تاكسي', expectAccount: null },
  { input: 'دفعت 150 في Uber', expectAmount: 150, expectIntent: 'transportation', expectDate: 'today', expectDesc: 'Uber', expectAccount: null },
  { input: 'دفعت 100 امبارح في تاكسي', expectAmount: 100, expectIntent: 'transportation', expectDate: 'yesterday', expectDesc: 'تاكسي', expectAccount: null },
  { input: 'I spent 100 yesterday on a taxi', expectAmount: 100, expectIntent: 'transportation', expectDate: 'yesterday', expectDesc: 'a taxi', expectAccount: null },
  { input: 'اشتريت من matar3m بـ200', expectAmount: 200, expectIntent: 'restaurant', expectDate: 'today', expectDesc: 'matar3m', expectAccount: null },
  { input: 'دفعت 50 في mowaslat', expectAmount: 50, expectIntent: 'transportation', expectDate: 'today', expectDesc: 'mowaslat', expectAccount: null },
  { input: 'النهارده جبت اكل بـ100', expectAmount: 100, expectIntent: 'food_and_drink', expectDate: 'today', expectDesc: 'اكل', expectAccount: null },
  { input: 'اول امبارح دفعت 50 في قهوة', expectAmount: 50, expectIntent: 'coffee', expectDate: 'the day before yesterday', expectDesc: 'قهوة', expectAccount: null },
  { input: 'دفعت فلوس كتير النهارده', expectAmount: null, expectIntent: null, expectDate: 'today', expectDesc: 'فلوس كتير', expectAccount: null },

  // INCOME DESCRIPTION TESTS
  { input: 'انا استلمت المرتب النهارده 1000 جنيه', expectAmount: 1000, expectDesc: 'المرتب', expectType: 'income' },
  { input: 'استلمت مرتبي 12000 جنيه', expectAmount: 12000, expectDesc: 'مرتبي', expectType: 'income' },
  { input: 'قبضت المرتب 10000 جنيه', expectAmount: 10000, expectDesc: 'المرتب', expectType: 'income' },
  { input: 'استلمت بونص 2000', expectAmount: 2000, expectDesc: 'بونص', expectType: 'income' },
  { input: 'وصلني تحويل 5000', expectAmount: 5000, expectDesc: 'تحويل', expectType: 'income' },
  { input: 'استلمت فلوس من الشغل 3000', expectAmount: 3000, expectDesc: 'فلوس الشغل', expectType: 'income' }, // prepositions removed, so 'فلوس الشغل' is good. Or 'فلوس من الشغل' if 'من' is kept. Let's accept 'فلوس الشغل'.

  // EXPENSE DESCRIPTION TESTS
  { input: 'دفعت 150 جنيه في KFC', expectAmount: 150, expectDesc: 'KFC', expectType: 'expense' },
  { input: 'جبت قهوة من Starbucks بـ80', expectAmount: 80, expectDesc: 'قهوة Starbucks', expectType: 'expense' }, // "من" removed
  { input: 'دفعت فاتورة النت 300', expectAmount: 300, expectDesc: 'فاتورة النت', expectType: 'expense' },

  // ACCOUNT TESTS
  { input: 'دفعت 100 جنيه بالكاش', expectAmount: 100, expectDesc: 'معاملة', expectAccount: 'acc1' },
  { input: 'دفعت 200 جنيه من المحفظة', expectAmount: 200, expectDesc: 'معاملة', expectAccount: 'acc2' },
  { input: 'I paid 100 EGP using Cash', expectAmount: 100, expectDesc: 'معاملة', expectAccount: 'acc4' },
  { input: 'I paid 200 from my Wallet', expectAmount: 200, expectDesc: 'معاملة', expectAccount: 'acc5' },
  
  // FRANCO ACCOUNT TESTS
  { input: 'دفعت 100 جنيه بkash', expectAmount: 100, expectDesc: 'معاملة', expectAccount: 'acc7' },
  { input: 'دفعت 200 من m7fza', expectAmount: 200, expectDesc: 'معاملة', expectAccount: 'acc8' },
  
  // CROSS-LANGUAGE TESTS (assuming user account is "Cash" but user typed "بالكاش", it should match acc4 if we only have acc4, but we have acc1 too.
  // We pass ALL accounts. Priority will pick exact match first!
  { input: 'I paid 100 using cash', expectAmount: 100, expectDesc: 'معاملة', expectAccount: 'acc4' },
  // Stored account: حساب البنك. User says: I paid 500 from the bank
  { input: 'I paid 500 from the bank', expectAmount: 500, expectDesc: 'معاملة', expectAccount: 'acc10', customAccounts: [ { _id: 'acc10', name: 'حساب البنك' } ] },

  // MERCHANT + ACCOUNT TESTS
  { input: 'دفعت 200 جنيه في Starbucks بالكاش', expectAmount: 200, expectDesc: 'Starbucks', expectAccount: 'acc1' },
  { input: 'دفعت 200 جنيه في KFC من المحفظة', expectAmount: 200, expectDesc: 'KFC', expectAccount: 'acc2' },

  // --- NEW ACCOUNT RESOLUTION TESTS FROM USER ---
  // TEST 1 — DEFAULT ACCOUNT MUST NOT OVERRIDE MATCH
  { input: 'دفعت 100 جنيه من المحفظة', expectAmount: 100, expectAccount: 'acc_m7fza', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_m7fza', name: 'm7fza' }, { _id: 'acc_bank', name: 'Bank' } ] },
  // TEST 2 — ARABIC TO ENGLISH
  { input: 'دفعت 100 جنيه كاش', expectAmount: 100, expectAccount: 'acc_cash', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_bank', name: 'Bank' }, { _id: 'acc_wallet', name: 'Wallet' } ] },
  // TEST 3 — ARABIC TO FRANCO
  { input: 'دفعت 200 جنيه من المحفظة', expectAmount: 200, expectAccount: 'acc_m7fza', customAccounts: [ { _id: 'acc_kash', name: 'kash' }, { _id: 'acc_m7fza', name: 'm7fza' }, { _id: 'acc_bank', name: 'bank' } ] },
  // TEST 4 — ARABIC TO ENGLISH BANK
  { input: 'دفعت 500 من البنك', expectAmount: 500, expectAccount: 'acc_bank', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_bank', name: 'Bank' }, { _id: 'acc_wallet', name: 'Wallet' } ] },
  // TEST 5 — ENGLISH INPUT
  { input: 'I paid 200 from my Wallet', expectAmount: 200, expectAccount: 'acc_wallet', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_wallet', name: 'Wallet' }, { _id: 'acc_bank', name: 'Bank' } ] },
  // TEST 6 — FRANCO INPUT
  { input: 'daft 200 mn el m7fza', expectAmount: 200, expectAccount: 'acc_m7fza', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_m7fza', name: 'm7fza' }, { _id: 'acc_bank', name: 'Bank' } ] },
  // TEST 7 — NO ACCOUNT MENTIONED
  { input: 'اشتريت قهوة بـ50', expectAmount: 50, expectAccount: null, customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_wallet', name: 'Wallet' }, { _id: 'acc_bank', name: 'Bank' } ] },
  // TEST 8 — UNKNOWN ACCOUNT
  { input: 'دفعت 200 من حساب مش موجود', expectAmount: 200, expectAccount: null, customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_wallet', name: 'Wallet' }, { _id: 'acc_bank', name: 'Bank' } ] },
  // TEST 9 — AMBIGUOUS ACCOUNT
  { input: 'دفعت 100 كاش', expectAmount: 100, expectAccount: null, customAccounts: [ { _id: 'acc_cash_en', name: 'Cash' }, { _id: 'acc_kash', name: 'kash' }, { _id: 'acc_wallet', name: 'Wallet' } ] },

  { input: 'دفعت 50 من تيلدا', expectAmount: 50, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'دفعت 50 من تلدا', expectAmount: 50, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'دفعت 50 من تلده', expectAmount: 50, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'دفعت 50 من تلدة', expectAmount: 50, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'I paid 50 from telda', expectAmount: 50, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'انا دفعت 100 جنيه في الاكل بحساب تيلدا', expectAmount: 100, expectAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'اشتريت بـ200 من ميزة', expectAmount: 200, expectAccount: 'acc_meeza', customAccounts: [ { _id: 'acc_meeza', name: 'meeza' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'حولت 100 من فودافون كاش', expectAmount: 100, expectSourceAccount: 'acc_vodafone', expectType: 'transfer', customAccounts: [ { _id: 'acc_vodafone', name: 'vodafone cash' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'دفعت 300 انستا باي', expectAmount: 300, expectAccount: 'acc_instapay', customAccounts: [ { _id: 'acc_instapay', name: 'InstaPay' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'سحبت 500 من كيو ان بي', expectAmount: 500, expectAccount: 'acc_qnb', customAccounts: [ { _id: 'acc_qnb', name: 'qnb' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'دفعت 100 من ببساطة', expectAmount: 100, expectAccount: 'acc_bebasata', customAccounts: [ { _id: 'acc_bebasata', name: 'Bebasata' }, { _id: 'acc_cash', name: 'Cash' } ] },
  { input: 'حولت 500 جنيه من البنك للمحفظة', expectAmount: 500, expectType: 'transfer', expectSourceAccount: 'acc_bank', expectDestAccount: 'acc_wallet', customAccounts: [ { _id: 'acc_bank', name: 'Bank' }, { _id: 'acc_wallet', name: 'Wallet' } ] },
  { input: 'نقلت 1000 من الكاش للبنك', expectAmount: 1000, expectType: 'transfer', expectSourceAccount: 'acc_cash', expectDestAccount: 'acc_bank', customAccounts: [ { _id: 'acc_cash', name: 'Cash' }, { _id: 'acc_bank', name: 'Bank' } ] },
  { input: 'حطيت 200 في فودافون كاش من البنك', expectAmount: 200, expectType: 'transfer', expectSourceAccount: 'acc_bank', expectDestAccount: 'acc_vodafone', customAccounts: [ { _id: 'acc_bank', name: 'Bank' }, { _id: 'acc_vodafone', name: 'vodafone' } ] },
  { input: 'حولت 200 جنيه من حساب تلده الي حساب ميزه', expectAmount: 200, expectType: 'transfer', expectSourceAccount: 'acc_telda', expectDestAccount: 'acc_meeza', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_meeza', name: 'Meeza' } ] },
  { input: 'حولت من فيزا ميزه الي فيزا تلده 300', expectAmount: 300, expectType: 'transfer', expectSourceAccount: 'acc_meeza', expectDestAccount: 'acc_telda', customAccounts: [ { _id: 'acc_telda', name: 'Telda' }, { _id: 'acc_meeza', name: 'Meeza' } ] }
];

const multiTests = [
  { input: 'اشتريت قهوة بـ30 من الكاش وركبت تاكسي بـ100 من المحفظة', expectCount: 2, 
    results: [ { expectAmount: 30, expectDesc: 'قهوة', expectAccount: 'acc1' }, { expectAmount: 100, expectDesc: 'تاكسي', expectAccount: 'acc2' } ] },
  { input: 'اشتريت قهوة بـ30 وساندوتش بـ50 بالكاش', expectCount: 2,
    results: [ { expectAmount: 30, expectDesc: 'قهوة', expectAccount: 'acc1' }, { expectAmount: 50, expectDesc: 'ساندوتش', expectAccount: 'acc1' } ] },
  { input: 'اشتريت قهوة بـ50 وبعدين ركبت تاكسي بـ100', expectCount: 2, 
    results: [ { expectAmount: 50, expectDesc: 'قهوة' }, { expectAmount: 100, expectDesc: 'تاكسي' } ] },
  { input: 'حولت 1000 من البنك للمحفظة وبعدين اشتريت قهوة بـ50 من المحفظة', expectCount: 2, 
    results: [ { expectAmount: 1000, expectType: 'transfer', expectSourceAccount: 'acc_bank', expectDestAccount: 'acc_wallet' }, { expectAmount: 50, expectType: 'expense', expectAccount: 'acc_wallet' } ],
    customAccounts: [ { _id: 'acc_bank', name: 'Bank' }, { _id: 'acc_wallet', name: 'Wallet' } ] }
];

let failed = 0;
let passed = 0;

function isSameDay(d1, d2) {
  const dt1 = new Date(d1);
  const dt2 = new Date(d2);
  return dt1.getDate() === dt2.getDate() && dt1.getMonth() === dt2.getMonth();
}

function getExpectedDate(rel) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (rel === 'yesterday') d.setDate(d.getDate() - 1);
  if (rel === 'the day before yesterday') d.setDate(d.getDate() - 2);
  return d.toISOString();
}

console.log("=== RUNNING SINGLE TESTS ===");
for (const t of tests) {
  const result = parseText(t.input, t.customAccounts || mockAccounts);
  if (result.length !== 1) {
    console.error(`❌ [FAIL] ${t.input} -> Expected 1 transaction, got ${result.length}`);
    failed++;
    continue;
  }
  
  const r = result[0];
  let pass = true;
  if (t.expectAmount !== undefined && r.amount !== t.expectAmount) {
     console.error(`❌ [FAIL AMOUNT] ${t.input} -> Expected ${t.expectAmount}, got ${r.amount}`); pass = false; 
  }
  if (t.expectIntent !== undefined && r.intent !== t.expectIntent) {
     console.error(`❌ [FAIL INTENT] ${t.input} -> Expected ${t.expectIntent}, got ${r.intent}`); pass = false; 
  }
  if (t.expectDate !== undefined && !isSameDay(r.date, getExpectedDate(t.expectDate))) {
     console.error(`❌ [FAIL DATE] ${t.input} -> Expected ${t.expectDate}, got ${r.date}`); pass = false;
  }
  if (t.expectType !== undefined && r.type !== t.expectType) {
     console.error(`❌ [FAIL TYPE] ${t.input} -> Expected ${t.expectType}, got ${r.type}`); pass = false;
  }
  if (t.expectDesc !== undefined && r.description !== t.expectDesc) {
     console.error(`❌ [FAIL DESC] ${t.input} -> Expected '${t.expectDesc}', got '${r.description}'`); pass = false;
  }
  if (t.expectAccount !== undefined && r.accountId !== t.expectAccount) {
     console.error(`❌ [FAIL ACCOUNT] ${t.input} -> Expected ${t.expectAccount}, got ${r.accountId}`); pass = false;
  }
  if (t.expectSourceAccount !== undefined && r.sourceAccountId !== t.expectSourceAccount) {
     console.error(`❌ [FAIL SOURCE ACCOUNT] ${t.input} -> Expected ${t.expectSourceAccount}, got ${r.sourceAccountId}`); pass = false;
  }
  if (t.expectDestAccount !== undefined && r.destinationAccountId !== t.expectDestAccount) {
     console.error(`❌ [FAIL DEST ACCOUNT] ${t.input} -> Expected ${t.expectDestAccount}, got ${r.destinationAccountId}`); pass = false;
  }
  
  if (pass) {
     console.log(`✅ [PASS] ${t.input}`);
     passed++;
  } else {
     failed++;
  }
}

console.log("\n=== RUNNING MULTI TESTS ===");
for (const t of multiTests) {
   const result = parseText(t.input, t.customAccounts || mockAccounts);
   if (result.length !== t.expectCount) {
      console.error(`❌ [FAIL MULTI COUNT] ${t.input} -> Expected count ${t.expectCount}, got ${result.length}`);
      failed++;
      continue;
   }
   
   let pass = true;
   for (let i = 0; i < t.expectCount; i++) {
      const exp = t.results[i];
      const r = result[i];
      if (exp.expectAmount !== undefined && r.amount !== exp.expectAmount) { console.error(`❌ [FAIL MULTI AMOUNT] i=${i} Exp ${exp.expectAmount}, got ${r.amount}`); pass = false; }
      if (exp.expectDesc !== undefined && r.description !== exp.expectDesc) { console.error(`❌ [FAIL MULTI DESC] i=${i} Exp '${exp.expectDesc}', got '${r.description}'`); pass = false; }
      if (exp.expectAccount !== undefined && r.accountId !== exp.expectAccount) { console.error(`❌ [FAIL MULTI ACCOUNT] i=${i} Exp ${exp.expectAccount}, got ${r.accountId}`); pass = false; }
      if (exp.expectSourceAccount !== undefined && r.sourceAccountId !== exp.expectSourceAccount) { console.error(`❌ [FAIL MULTI SOURCE ACC] i=${i} Exp ${exp.expectSourceAccount}, got ${r.sourceAccountId}`); pass = false; }
      if (exp.expectDestAccount !== undefined && r.destinationAccountId !== exp.expectDestAccount) { console.error(`❌ [FAIL MULTI DEST ACC] i=${i} Exp ${exp.expectDestAccount}, got ${r.destinationAccountId}`); pass = false; }
   }
   
   if (pass) {
      console.log(`✅ [PASS MULTI] ${t.input}`);
      passed++;
   } else {
      failed++;
   }
}

const total = passed + failed;
console.log(`\n=== RESULTS: Passed: ${passed}/${total} | Failed: ${failed}/${total} ===`);
if (failed > 0) process.exit(1);
