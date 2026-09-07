const fs = require('fs');
let code = fs.readFileSync('test-sms-merchant-integration.js', 'utf8');
code = code.replace(/merchant: 'FAWRY', expected: null/g, "merchant: 'FAWRY', expected: 'bills'");
code = code.replace(/merchant: 'AWS', expected: null/g, "merchant: 'AWS', expected: 'subscriptions'");
fs.writeFileSync('test-sms-merchant-integration.js', code);
