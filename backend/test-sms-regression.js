require('dotenv').config();
const mongoose = require('mongoose');
const { parseSms } = require('./services/smsParser');
const Account = require('./models/Account');
const User = require('./models/User');

const TEST_CASES = [
  {
    desc: '1. English debit card transaction',
    sms: 'Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56 for lost/stolen card call 19700',
    expected: { type: 'expense', amount: 257.14, cardLast4: '1984' },
    checkMerchant: (m) => m && m.includes('Top Up ETISALAT')
  },
  {
    desc: '2. Arabic prepaid card / IPN purchase',
    sms: 'تم خصم مبلغ 60.01 جم لحظيا باستخدام شبكة المدفوعات اللحظية من بطاقتكم (مسبقة الدفع/المرتبات) عند Mobile Recharge يوم 08-13 الساعة 03:17 مرجع التاجر [1437436062] للمزيد اتصل بـ 19623',
    expected: { type: 'expense', amount: 60.01, cardLast4: null },
    checkMerchant: (m) => m && m.includes('Mobile Recharge')
  },
  {
    desc: '3. English IPN transfer sent',
    sms: 'IPN transfer sent with amount of EGP 300.00 from 0694 on 25/08 at 04:27 AM. Ref# 226f1cc5. For more details call 19700',
    expected: { type: 'expense', amount: 300, cardLast4: '0694' }
  },
  {
    desc: '4. Arabic prepaid transfer out',
    sms: 'تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 10.00 جم إلى سيف م**** ا*** س*** ا*** ز** رقم مرجعي 566651352320 يوم 08-21 الساعة 04:50 للمزيد اتصل بـ 19623',
    expected: { type: 'expense', amount: 10, cardLast4: null }
  },
  {
    desc: '5. Arabic prepaid card purchase',
    sms: 'تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE C يوم 20/07/26 الساعه 10:42 المتاح 1593.2EGP للمزيد إتصل ب ١٩٦٢٣',
    expected: { type: 'expense', amount: 404.7, cardLast4: '2513' },
    checkMerchant: (m) => m && m.includes('PAYMOB*LIMBO CAFE')
  },
  {
    desc: '6. Vodafone Cash transfer',
    sms: '300 L.E were successfully transferred to 01223212038 the transfer fee is 1 LE, your current Vodafone Cash balance is 1937.55 L.E. Transaction date: 26-07-29 05:28 Transaction ID: 022157551991',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '7. Vodafone Cash recharge',
    sms: '140 L.E was successfully recharged to your mobile balance; your current Vodafone Cash balance is 1564.32 LE',
    expected: { type: 'expense', amount: 140, cardLast4: null }
  },
  {
    desc: '8. Vodafone Cash payment',
    sms: 'تم دفع مبلغ 480.0جنية لSwvl. رصيد محفظتك الحالي 2997.98 جنيه. رقم العملية 022431701746 تاريخ العملية 06-08-26 16:49.',
    expected: { type: 'expense', amount: 480, cardLast4: null },
    checkMerchant: (m) => m && m.includes('Swvl')
  },
  {
    desc: '9. Vodafone Cash withdrawal',
    sms: 'تم سحب 1000.00 جنية من محفظة فودافون كاش. رصيد حسابك الحالي 467.98 جنيه. تاريخ العملية 21:40 26-08-15 رقم العملية 022729264572.',
    expected: { type: 'expense', amount: 1000, cardLast4: null }
  },
  {
    desc: '10. Arabic ADIB account transaction',
    sms: 'تم خصم 95.50 EGP من حسابك 100001269596 فى 25/08/2026 04:02:14 PM علما بأن رصيدكم الحالي 2.69',
    expected: { type: 'expense', amount: 95.50, cardLast4: '9596' }
  },
  {
    desc: '11. English ADIB IPN transaction',
    sms: 'Your account ending in 9596 has been charged the amount of 95.5 for an IPN transfer on 2026-08-25 15:55 Txn Ref: 09d676e7',
    expected: { type: 'expense', amount: 95.5, cardLast4: '9596' }
  },
  {
    desc: '12. Arabic ADIB account transaction 2',
    sms: 'تم خصم 8008.00 EGP من حسابك 100001269596 فى 23/08/2026 02:11:37 AM علما بأن رصيدكم الحالي 199.19',
    expected: { type: 'expense', amount: 8008, cardLast4: '9596' }
  },
  {
    desc: '13. English ADIB IPN transaction 2',
    sms: 'Your account ending in 9596 has been charged the amount of 500.5 for an IPN transfer on 2026-08-18 17:56 Txn Ref: 1be731da',
    expected: { type: 'expense', amount: 500.5, cardLast4: '9596' }
  },
  {
    desc: '14. Banque Misr POS',
    sms: 'شكرًا لاستخدامك بطاقة بنك مصر ***6614، تم الآن خصم 212.00 EGPعند FAWRYPF*HANA MARKETSQAL يوم 21/08/2026 ، الرصيد المتاح EGP 8704.94',
    expected: { type: 'expense', amount: 212, cardLast4: '6614' },
    checkMerchant: (m) => m && m.includes('FAWRYPF*HANA MARKETSQAL')
  },
  {
    desc: '15. Arabic IPN transfer sent',
    sms: 'تم تحويل مبلغ 6650EGP من حساب رقم xxx6201 فى 20-AUG-2026 عن طريق التحويل اللحظي',
    expected: { type: 'expense', amount: 6650, cardLast4: '6201' }
  },
  {
    desc: '16. Arabic prepaid transfer received',
    sms: 'تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 300.00 جم من سيف مصطفى احمد سامى احمد زيد رقم مرجعي 509818302771 يوم 08-12 الساعة 23:27 للمزيد اتصل بـ 19623',
    expected: { type: 'income', amount: 300, cardLast4: null }
  },
  {
    desc: '17. English IPN received',
    sms: 'IPN transfer received with amount of EGP 200.00 on 0694 on 24/08 at 12:48 PM. Ref# 0447d84d.',
    expected: { type: 'income', amount: 200, cardLast4: '0694' }
  },
  {
    desc: '18. Arabic IPN received',
    sms: 'تم اضافة مبلغ 20000EGP الى حساب رقم xxx6201 فى 19-AUG-2026 عن طريق التحويل اللحظي',
    expected: { type: 'income', amount: 20000, cardLast4: '6201' }
  },
  {
    desc: '19. Arabic ADIB income',
    sms: 'عميلنا العزيز, نوجه عناية سيادتكم أنه تم إضافة 8700.00 EGP الى حسابك رقم 100001269596 فى 22/08/2026 10:44:17 PM علما بأن رصيدكم الحالى 29627.19 شكرا لاختيارك ADIB',
    expected: { type: 'income', amount: 8700, cardLast4: '9596' }
  },
  {
    desc: '20. Arabic ADIB income 2',
    sms: 'عميلنا العزيز, نوجه عناية سيادتكم أنه تم إضافة 10.00 EGP الى حسابك رقم 100001269596 فى 20/08/2026 03:41:00 AM علما بأن رصيدكم الحالى 20027.64 شكرا لاختيارك ADIB',
    expected: { type: 'income', amount: 10, cardLast4: '9596' }
  },
  {
    desc: '21. Vodafone Cash received',
    sms: 'تم استلام مبلغ 450.00 جنيه من 01065001413 المسجل بإسم AHMED MOHAMED HASANEIN YOUSSEF على رقم محفظتك 01020441385 بتاريخ 18:45 26-08-23. رصيدك الحالي: 3522.98 جنيه رقم العملية: 022975974894',
    expected: { type: 'income', amount: 450, cardLast4: null }
  },
  // --- ADVERSARIAL TESTS ---
  {
    desc: '22. Adversarial: Transaction ID',
    sms: 'Successful transaction of EGP 300. Transaction ID 12341984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '23. Adversarial: Reference number',
    sms: 'Successful transaction of EGP 300. Reference number 55551984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '24. Adversarial: Balance EGP',
    sms: 'Successful transaction of EGP 300. Your current balance is 1984 EGP',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '25. Adversarial: Phone number in text',
    sms: 'Successful transaction of EGP 300. Call us at 0100011984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '26. Adversarial: Transaction amount',
    sms: 'Transaction amount 1984 EGP',
    expected: { type: 'expense', amount: 1984, cardLast4: null }
  },
  {
    desc: '27. Adversarial: Ref#',
    sms: 'Successful transaction of EGP 300. Ref# 1984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '28. Adversarial: Arabic Process ID',
    sms: 'تم خصم مبلغ 300 جنيه. رقم العملية 1984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '29. Adversarial: Arabic Balance',
    sms: 'تم خصم مبلغ 300 جنيه. الرصيد الحالي 1984',
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    desc: '30. Adversarial: Egyptian Phone 1',
    sms: 'تم استلام مبلغ 300 جنيه من 01012341984',
    expected: { type: 'income', amount: 300, cardLast4: null }
  },
  {
    desc: '31. Adversarial: Egyptian Phone 2',
    sms: 'تم استلام مبلغ 300 جنيه من 012341984',
    expected: { type: 'income', amount: 300, cardLast4: null }
  },
  {
    desc: '32. Adversarial: Combined explicit and false positive',
    sms: 'تم خصم مبلغ 300 جنيه من بطاقة رقم 9596. الرصيد 1234. رقم العملية 5555',
    expected: { type: 'expense', amount: 300, cardLast4: '9596' }
  }
];

let failed = 0;

console.log('--- RUNNING SMS PARSER REGRESSION TESTS ---');
TEST_CASES.forEach((tc) => {
  const parsed = parseSms(tc.sms);
  let passed = true;
  let errors = [];

  if (!parsed) {
    passed = false;
    errors.push('Parser returned null.');
  } else {
    if (parsed.type !== tc.expected.type) {
      passed = false;
      errors.push(`Expected type ${tc.expected.type}, got ${parsed.type}`);
    }
    if (parsed.amount !== tc.expected.amount) {
      passed = false;
      errors.push(`Expected amount ${tc.expected.amount}, got ${parsed.amount}`);
    }
    if (parsed.cardLast4 !== tc.expected.cardLast4) {
      passed = false;
      errors.push(`Expected cardLast4 ${tc.expected.cardLast4}, got ${parsed.cardLast4}`);
    }
    if (tc.checkMerchant && !tc.checkMerchant(parsed.merchant)) {
      passed = false;
      errors.push(`Merchant validation failed. Got: ${parsed.merchant}`);
    }
  }

  if (passed) {
    console.log(`[PASS] ${tc.desc}`);
  } else {
    failed++;
    console.log(`[FAIL] ${tc.desc}`);
    errors.forEach(e => console.log(`       - ${e}`));
  }
});

console.log('\\n--- END TO END ACCOUNT MATCHING TEST ---');

async function testE2E() {
  let passed = true;
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova_test_db');
    
    await User.deleteMany({});
    await Account.deleteMany({});
    
    const user = await User.create({
      name: 'Test',
      email: 'test@example.com',
      password: 'password'
    });

    const account = await Account.create({
      user: user._id,
      name: 'Test Card',
      type: 'bank',
      cardLast4: '1984',
      currency: 'EGP',
      balance_adjustment: 0
    });

    const sms = 'Your Debit Card **1984 had a Successful transaction of EGP 257.14';
    const parsed = parseSms(sms);
    
    let matchedAccount = null;
    if (parsed && parsed.cardLast4) {
      matchedAccount = await Account.findOne({ user: user._id, cardLast4: parsed.cardLast4 });
    }

    if (matchedAccount && matchedAccount._id.toString() === account._id.toString()) {
      console.log('[PASS] E2E Account Matching Succeeded');
    } else {
      console.log('[FAIL] E2E Account Matching Failed');
      console.log(`       Expected account ID: ${account._id}`);
      console.log(`       Got: ${matchedAccount ? matchedAccount._id : 'null'}`);
      passed = false;
    }

    // Negative test
    const negSms = 'Call 01012341984 for more info about payment 200 L.E';
    const negParsed = parseSms(negSms);
    if (negParsed && negParsed.cardLast4) {
      console.log('[FAIL] E2E Negative Test Failed: matched phone number as cardLast4');
      passed = false;
    } else {
      console.log('[PASS] E2E Negative Test Succeeded');
    }

  } catch (err) {
    console.error('[FAIL] E2E Error:', err);
    passed = false;
  } finally {
    await mongoose.disconnect();
    if (failed > 0 || !passed) {
      process.exit(1);
    } else {
      console.log('All tests passed.');
      process.exit(0);
    }
  }
}

testE2E();
