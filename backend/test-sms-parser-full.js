const { parseSms } = require('./services/smsParser');

const testCases = [
  // Examples from user
  {
    sms: "Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56 for lost/stolen card call 19700",
    expected: { type: 'expense', amount: 257.14, cardLast4: '1984' }
  },
  {
    sms: "تم خصم مبلغ 60.01 جم لحظيا باستخدام شبكة المدفوعات اللحظية من بطاقتكم (مسبقة الدفع/المرتبات) عند Mobile Recharge يوم 08-13 الساعة 03:17 مرجع التاجر 1437436062 للمزيد اتصل بـ 19623",
    expected: { type: 'expense', amount: 60.01, cardLast4: null }
  },
  {
    sms: "IPN transfer sent with amount of EGP 300.00 from 0694 on 25/08 at 04:27 AM. Ref# 226f1cc5. For more details call 19700",
    expected: { type: 'expense', amount: 300, cardLast4: '0694' }
  },
  {
    sms: "تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 10.00 جم إلى سيف م**** ا*** س*** ا*** ز** رقم مرجعي 566651352320 يوم 08-21 الساعة 04:50 للمزيد اتصل بـ 19623",
    expected: { type: 'expense', amount: 10, cardLast4: null }
  },
  {
    sms: "تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE C يوم 20/07/26 الساعه 10:42 المتاح 1593.2EGP للمزيد إتصل ب ١٩٦٢٣",
    expected: { type: 'expense', amount: 404.7, cardLast4: '2513' }
  },
  {
    sms: "300 L.E were successfully transferred to 01223212038 the transfer fee is 1 LE, your current Vodafone Cash balance is 1937.55 L.E. Transaction date: 26-07-29 05:28 Transaction ID: 022157551991 Transfer your money faster and easier through the Ana Vodafone App, and manage your transactions via http://vf.eg/vfcash",
    expected: { type: 'expense', amount: 300, cardLast4: null }
  },
  {
    sms: "140 L.E was successfully recharged to your mobile balance; your current Vodafone Cash balance is 1564.32 LE; View your transaction history on Ana Vodafone App to track your spending: http://vf.eg/vfcash",
    expected: { type: 'expense', amount: 140, cardLast4: null }
  },
  {
    sms: "تم دفع مبلغ 480.0جنية لSwvl. رصيد محفظتك الحالي 2997.98 جنيه. رقم العملية 022431701746 تاريخ العملية 06-08-26 16:49. دلوقتي ولأول مرة تقدر تشحن أي كارت كهرباء بفودافون كاش من مكانك ,دوس على http://vf.eg/vfcash واختار خدمة شحن كارت الكهرباء.",
    expected: { type: 'expense', amount: 480, cardLast4: null }
  },
  {
    sms: "تم سحب 1000.00 جنية من محفظة فودافون كاش. رصيد حسابك الحالي 467.98 جنيه. تاريخ العملية 21:40 26-08-15 رقم العملية; 022729264572. دلوقتي تقدر تسحب من محفظتك برسوم 5 جنيه بس بدل 1%! كلم *9*999# واشترك علشان تسحب لحد 5000 جنيه شهريًا من محفظتك برسوم ثابتة وأوفر!",
    expected: { type: 'expense', amount: 1000, cardLast4: null }
  },
  {
    sms: "تم خصم 95.50 EGP من حسابك 100001269596 فى 25/08/2026 04:02:14 PM علما بأن رصيدكم الحالي 2.69 برجاء الدخول على الرابط التالى لتقييم مدى رضاك عن مستوى الخدمه https://bit.ly/2OHrV93",
    expected: { type: 'expense', amount: 95.5, cardLast4: '9596' }
  },
  {
    sms: "Your account ending in 9596 has been charged the amount of 95.5 for an IPN transfer on 2026-08-25 15:55 Txn Ref: 09d676e7 For further details please call 19951",
    expected: { type: 'expense', amount: 95.5, cardLast4: '9596' }
  },
  {
    sms: "تم خصم 8008.00 EGP من حسابك 100001269596 فى 23/08/2026 02:11:37 AM علما بأن رصيدكم الحالي 199.19 برجاء الدخول على الرابط التالى لتقييم مدى رضاك عن مستوى الخدمه https://bit.ly/2OHrV93",
    expected: { type: 'expense', amount: 8008, cardLast4: '9596' }
  },
  {
    sms: "Your account ending in 9596 has been charged the amount of 500.5 for an IPN transfer on 2026-08-18 17:56 Txn Ref: 1be731da For further details please call 19951",
    expected: { type: 'expense', amount: 500.5, cardLast4: '9596' }
  },
  {
    sms: "شكرًا لاستخدامك بطاقة بنك مصر ***6614، تم الآن خصم 212.00 EGPعند FAWRYPF*HANA MARKETSQAL يوم 21/08/2026 ، الرصيد المتاح EGP 8704.94 لمزيد من المعلومات عن الحساب، تفضل بزيارة الرابط التالي https://bnkmsr.com/online",
    expected: { type: 'expense', amount: 212, cardLast4: '6614' }
  },
  {
    sms: "تم تحويل مبلغ 6650EGP من حساب رقم xxx6201 فى 20-AUG-2026 عن طريق التحويل اللحظي",
    expected: { type: 'expense', amount: 6650, cardLast4: '6201' }
  },
  {
    sms: "تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 300.00 جم من سيف مصطفى احمد سامى احمد زيد رقم مرجعي 509818302771 يوم 08-12 الساعة 23:27 للمزيد اتصل بـ 19623",
    expected: { type: 'income', amount: 300, cardLast4: null }
  },
  {
    sms: "IPN transfer received with amount of EGP 200.00 on 0694 on 24/08 at 12:48 PM. Ref# 0447d84d. For more details call 19700",
    expected: { type: 'income', amount: 200, cardLast4: '0694' }
  },
  {
    sms: "تم اضافة مبلغ 20000EGP الى حساب رقم xxx6201 فى 19-AUG-2026 عن طريق التحويل اللحظي",
    expected: { type: 'income', amount: 20000, cardLast4: '6201' }
  },
  {
    sms: "عميلنا العزيز, نوجه عناية سيادتكم أنه تم إضافة 8700.00 EGP الى حسابك رقم 100001269596 فى 22/08/2026 10:44:17 PM علما بأن رصيدكم الحالى 29627.19 شكرا لاختيارك ADIB",
    expected: { type: 'income', amount: 8700, cardLast4: '9596' }
  },
  {
    sms: "عميلنا العزيز, نوجه عناية سيادتكم أنه تم إضافة 10.00 EGP الى حسابك رقم 100001269596 فى 20/08/2026 03:41:00 AM علما بأن رصيدكم الحالى 20027.64 شكرا لاختيارك ADIB",
    expected: { type: 'income', amount: 10, cardLast4: '9596' }
  },
  {
    sms: "تم استلام مبلغ 450.00 جنيه من 01065001413 المسجل بإسم AHMED MOHAMED HASANEIN YOUSSEF على رقم محفظتك 01020441385 بتاريخ 18:45 26-08-23. رصيدك الحالي: 3522.98 جنيه رقم العملية: 022975974894 تقدر تتابع كل مصروفاتك من تاريخ المعاملات على أبلكيشن أنا فودافون http://vf.eg/vfcash",
    expected: { type: 'income', amount: 450, cardLast4: '1385' }
  },
  // QNB Specific Examples
  {
    sms: "QNBALAHLI: Purchase of EGP 500.00 using card ending 3456 at STARBUCKS, Available balance is EGP 1050.00",
    expected: { type: 'expense', amount: 500.00, cardLast4: '3456' }
  },
  {
    sms: "QNB: EGP 1000.50 has been debited from your account ending with 1234 on 01/01/2026. Ref: 12345",
    expected: { type: 'expense', amount: 1000.50, cardLast4: '1234' }
  },
  {
    sms: "QNB Alahli: Cash withdrawal of EGP 2000 from ATM using card 4321. Avl Bal EGP 100",
    expected: { type: 'expense', amount: 2000, cardLast4: '4321' }
  },
  {
    sms: "تم خصم مبلغ 350.00 جم من بطاقتكم QNB Alahli المنتهية بـ 9988 يوم 25-08-2026",
    expected: { type: 'expense', amount: 350, cardLast4: '9988' }
  },
  {
    sms: "تم ايداع مبلغ 5000.00 EGP فى حسابك ببنك قطر الوطنى المنتهى بـ 1122",
    expected: { type: 'income', amount: 5000, cardLast4: '1122' }
  }
];

let failed = 0;

testCases.forEach((tc, i) => {
  const result = parseSms(tc.sms);
  if (!result) {
    console.log(`❌ Example ${i + 1} FAILED to parse completely`);
    failed++;
    return;
  }
  
  let passed = true;
  if (result.type !== tc.expected.type) {
    console.log(`❌ Example ${i + 1} FAILED: Expected type '${tc.expected.type}' but got '${result.type}'`);
    passed = false;
  }
  if (result.amount !== tc.expected.amount) {
    console.log(`❌ Example ${i + 1} FAILED: Expected amount '${tc.expected.amount}' but got '${result.amount}'`);
    passed = false;
  }
  if (result.cardLast4 !== tc.expected.cardLast4) {
    console.log(`❌ Example ${i + 1} FAILED: Expected cardLast4 '${tc.expected.cardLast4}' but got '${result.cardLast4}'`);
    passed = false;
  }

  if (passed) {
    console.log(`✅ Example ${i + 1} PASSED`);
  } else {
    failed++;
  }
});

if (failed === 0) {
  console.log(`\n🎉 ALL ${testCases.length} TESTS PASSED SUCCESSFULLY!`);
} else {
  console.log(`\n🚨 ${failed} TESTS FAILED! Check the output above.`);
  process.exit(1);
}
