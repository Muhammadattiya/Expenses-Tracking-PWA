const { parseSms } = require('./backend/services/smsParser');

const testCases = [
  {
    sms: "تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 104.00 جم إلى NOUR H**** Z****** S***** رقم مرجعي 102014695024 يوم 07-22 الساعة 09:57 للمزيد اتصل بـ 19623",
    expected: { type: 'expense', amount: 104.00, cardLast4: null }
  },
  {
    sms: "تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 1000.00 جم من محمد علاء حسن حسين ابوعيطه رقم مرجعي 165921364018 يوم 07-21 الساعة 23:40 للمزيد اتصل بـ 19623",
    expected: { type: 'income', amount: 1000.00, cardLast4: null }
  },
  {
    sms: "تم خصم 404.7 EGP  من بطاقة المدفوعة مقدما رقم 2513  باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE       C  يوم 20/07/26  الساعه 10:42  المتاح 1593.2EGP  للمزيد إتصل ب ١٩٦٢٣",
    expected: { type: 'expense', amount: 404.7, cardLast4: '2513' }
  },
  // Edge cases
  { sms: "رصيدك الحالي 500 جم", expected: { type: 'unknown' } }, 
  { sms: "", expected: null }, 
  { sms: "Your OTP is 123456", expected: null }, 
];

testCases.forEach((tc, i) => {
  const result = parseSms(tc.sms);
  console.log(`Test ${i + 1}:`, JSON.stringify(result));
});
