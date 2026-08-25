const { parseSms } = require('./services/smsParser');

const examples = [
  "Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56 for lost/stolen card call 19700",
  "تم خصم مبلغ 60.01 جم لحظيا باستخدام شبكة المدفوعات اللحظية من بطاقتكم (مسبقة الدفع/المرتبات) عند Mobile Recharge يوم 08-13 الساعة 03:17 مرجع التاجر 1437436062 للمزيد اتصل بـ 19623",
  "تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 300.00 جم من سيف مصطفى احمد سامى احمد زيد رقم مرجعي 509818302771 يوم 08-12 الساعة 23:27 للمزيد اتصل بـ 19623",
  "IPN transfer received with amount of EGP 200.00 on 0694 on 24/08 at 12:48 PM. Ref# 0447d84d. For more details call 19700",
  "IPN transfer sent with amount of EGP 300.00 from 0694 on 25/08 at 04:27 AM. Ref# 226f1cc5. For more details call 19700",
  "تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 10.00 جم إلى سيف م**** ا*** س*** ا*** ز** رقم مرجعي 566651352320 يوم 08-21 الساعة 04:50 للمزيد اتصل بـ 19623"
];

examples.forEach((sms, i) => {
  console.log(`\n--- Example ${i+1} ---`);
  const result = parseSms(sms);
  console.log(JSON.stringify(result, null, 2));
});
