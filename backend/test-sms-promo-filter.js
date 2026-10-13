const assert = require('assert');
const { parseSms } = require('./services/smsParser');

const promoCases = [
  // User's exact example
  "خصمك جاهز خصم %10 لحد 300 جنيه على الموبايلات، الإكسسوارات والتليفزيونات استخدم كود: FIRST10 https://myeand.page.link/Eshop الكود متاح لجميع المنتجات المقدمة من اتصالات",
  // Telecom offers
  "اشترك الآن واستمتع بخصم يصل إلى 50% على باقات الموبايل والإنترنت. العرض ساري لفترة محدودة استخدم بروموكود: SUMMER26",
  "وفر حتى 200 جنيه عند الدفع باستخدام الكود SAVE20 من خلال اللينك bit.ly/eshop",
  "خصومات تصل إلى 40% على جميع الإلكترونيات تسوق الآن من خلال فروعنا أو الموقع"
];

const legitimateTxCases = [
  "تم خصم مبلغ 350.00 جم من بطاقتكم المنتهية بـ 9988 يوم 25-08-2026",
  "Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt",
  "تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE C يوم 20/07/26",
  "IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a."
];

console.log('Testing Promotional SMS Filter...');

promoCases.forEach((sms, i) => {
  const result = parseSms(sms);
  assert.strictEqual(result, null, `Promo case ${i + 1} must be rejected (returned null)`);
});

legitimateTxCases.forEach((sms, i) => {
  const result = parseSms(sms);
  assert.notStrictEqual(result, null, `Legitimate tx case ${i + 1} must NOT be rejected`);
  assert.ok(result.amount > 0, `Legitimate tx case ${i + 1} must extract amount`);
});

console.log('✅ Promotional SMS Filter unit tests passed successfully!');
