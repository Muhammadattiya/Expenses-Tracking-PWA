const { parseSms } = require('./services/smsParser');
const { classifyMerchant } = require('./services/merchantIntelligence/globalMerchantDictionary');

function evaluate(sms, expected) {
  const parsed = parseSms(sms);
  const result = classifyMerchant(parsed.merchant);
  console.log('---');
  console.log('Input SMS:', sms);
  console.log('Parsed Merchant:', parsed.merchant);
  console.log('Actual Result:', result);
  console.log('Expected Result:', expected);
}

evaluate('Purchase of EGP 200 at AMAZON WEB SERVICES on card 1234', 'subscriptions');
evaluate('شكرًا لاستخدامك بطاقة بنك مصر ***6614، تم الآن خصم 212.00 EGPعند FAWRYPF*HANA MARKETSQAL يوم 21/08/2026 ، الرصيد المتاح EGP 8704.94', null);
