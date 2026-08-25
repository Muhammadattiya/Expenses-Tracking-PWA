/**
 * SMS Parser Engine for Finova
 * 
 * This module is responsible for parsing financial SMS messages to extract transaction details.
 * Note: Currently calibrated against 3 specific templates from a prepaid card issuer.
 * Other banks/issuers will require adding new patterns to the BANK_PATTERNS array.
 */

const BANK_PATTERNS = [
  {
    // Pattern 1: Transfer Out (Expense) - Arabic
    // Example: تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 10.00 جم إلى سيف م**** ا*** س*** ا*** ز** رقم مرجعي 566651352320
    id: 'prepaid_transfer_out',
    match: /تم تنفيذ تحويل لحظي.*بمبلغ/i,
    extract: (text) => {
      const amountMatch = text.match(/بمبلغ\s+([\d.]+)\s*(جم|EGP)/i);
      const counterpartyMatch = text.match(/إلى\s+(.*?)\s+رقم مرجعي/i);
      const refMatch = text.match(/رقم مرجعي\s+(\d+)/i);
      
      if (!amountMatch) return null;
      
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense', // default guess
        merchant: counterpartyMatch ? counterpartyMatch[1].trim() : null,
        referenceNumber: refMatch ? refMatch[1] : null,
        cardLast4: null
      };
    }
  },
  {
    // Pattern 2: Transfer In (Income) - Arabic
    // Example: تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 300.00 جم من سيف مصطفى احمد سامى احمد زيد رقم مرجعي 509818302771
    id: 'prepaid_transfer_in',
    match: /تم إضافة تحويل لحظي.*بمبلغ/i,
    extract: (text) => {
      const amountMatch = text.match(/بمبلغ\s+([\d.]+)\s*(جم|EGP)/i);
      const counterpartyMatch = text.match(/من\s+(.*?)\s+رقم مرجعي/i);
      const refMatch = text.match(/رقم مرجعي\s+(\d+)/i);
      
      if (!amountMatch) return null;
      
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: counterpartyMatch ? counterpartyMatch[1].trim() : null,
        referenceNumber: refMatch ? refMatch[1] : null,
        cardLast4: null
      };
    }
  },
  {
    // Pattern 3: POS / Purchase (Expense) - Arabic
    // Example: تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE       C  يوم 20/07/26
    id: 'prepaid_purchase',
    match: /تم خصم.*من بطاقة.*عند/i,
    extract: (text) => {
      const amountMatch = text.match(/تم خصم\s+([\d.]+)\s*(جم|EGP)/i);
      const cardMatch = text.match(/رقم\s+(\d{4})/i);
      const merchantMatch = text.match(/عند\s+(.*?)\s+يوم/i);
      const balanceMatch = text.match(/المتاح\s+([\d.]+)/i);
      
      if (!amountMatch) return null;

      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        cardLast4: cardMatch ? cardMatch[1] : null,
        merchant: merchantMatch ? merchantMatch[1].trim() : null,
        balanceAfter: balanceMatch ? parseFloat(balanceMatch[1]) : null,
        referenceNumber: null
      };
    }
  },
  {
    // Pattern 4: Instapay Network (Expense) - Arabic
    // Example: تم خصم مبلغ 60.01 جم لحظيا باستخدام شبكة المدفوعات اللحظية من بطاقتكم (مسبقة الدفع/المرتبات) عند Mobile Recharge يوم 08-13 الساعة 03:17 مرجع التاجر 1437436062 للمزيد اتصل بـ 19623
    id: 'instapay_purchase_ar',
    match: /تم خصم مبلغ.*باستخدام شبكة المدفوعات اللحظية/i,
    extract: (text) => {
      const amountMatch = text.match(/خصم مبلغ\s+([\d.]+)\s*(جم|EGP)/i);
      const merchantMatch = text.match(/عند\s+(.*?)\s+يوم/i);
      const refMatch = text.match(/مرجع التاجر\s+(\d+)/i);
      // Fallback check for card last 4 if provided elsewhere
      const cardMatch = text.match(/رقم\s+(\d{4})/i) || text.match(/\*{2,}(\d{4})/i);
      
      if (!amountMatch) return null;

      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        cardLast4: cardMatch ? cardMatch[1] : null,
        merchant: merchantMatch ? merchantMatch[1].trim() : null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    // Pattern 5: Successful Transaction English
    // Example: Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56
    id: 'english_successful_tx',
    match: /Successful transaction of/i,
    extract: (text) => {
      const cardMatch = text.match(/Card\s+\*{2,}(\d{4})/i);
      const amountMatch = text.match(/EGP\s*([\d.]+)/i) || text.match(/([\d.]+)\s*EGP/i);
      const merchantMatch = text.match(/@([^,]+)/i);
      
      if (!amountMatch) return null;

      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        cardLast4: cardMatch ? cardMatch[1] : null,
        merchant: merchantMatch ? merchantMatch[1].trim() : null,
        referenceNumber: null
      };
    }
  },
  {
    // Pattern 6: IPN transfer received English
    // Example: IPN transfer received with amount of EGP 200.00 on 0694 on 24/08 at 12:48 PM. Ref# 0447d84d.
    id: 'english_ipn_received',
    match: /IPN transfer received/i,
    extract: (text) => {
      const amountMatch = text.match(/EGP\s*([\d.]+)/i);
      const cardMatch = text.match(/on\s+(\d{4})\s+on/i);
      const refMatch = text.match(/Ref#\s*([a-zA-Z0-9]+)/i);
      
      if (!amountMatch) return null;

      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: 'IPN Transfer',
        cardLast4: cardMatch ? cardMatch[1] : null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    // Pattern 7: IPN transfer sent English
    // Example: IPN transfer sent with amount of EGP 300.00 from 0694 on 25/08 at 04:27 AM. Ref# 226f1cc5.
    id: 'english_ipn_sent',
    match: /IPN transfer sent/i,
    extract: (text) => {
      const amountMatch = text.match(/EGP\s*([\d.]+)/i);
      const cardMatch = text.match(/from\s+(\d{4})\s+on/i);
      const refMatch = text.match(/Ref#\s*([a-zA-Z0-9]+)/i);
      
      if (!amountMatch) return null;

      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'IPN Transfer',
        cardLast4: cardMatch ? cardMatch[1] : null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  }
];

/**
 * Parses an SMS string and returns transaction details if matched.
 * @param {string} smsText 
 * @returns {Object|null} Extracted data or null if not a recognized financial SMS.
 */
const parseSms = (smsText) => {
  if (!smsText || typeof smsText !== 'string') return null;

  for (const pattern of BANK_PATTERNS) {
    if (pattern.match.test(smsText)) {
      const extracted = pattern.extract(smsText);
      if (extracted) {
        return {
          ...extracted,
          rawSms: smsText,
          confidence: 'high'
        };
      }
    }
  }

  // Fallback: If no strict pattern matches, try to guess if it's a transaction
  // but mark it as needs_manual_review.
  const hasAmount = smsText.match(/([\d.]+)\s*(جم|EGP|جنيه)/i) || smsText.match(/(EGP)\s*([\d.]+)/i);
  const isFinancial = /(خصم|شراء|إيداع|تحويل|سحب|مبلغ|transaction|transfer|payment|paid)/i.test(smsText);

  if (hasAmount && isFinancial) {
    const amountVal = hasAmount[2] === 'EGP' ? parseFloat(hasAmount[2]) : parseFloat(hasAmount[1] || hasAmount[2]); // handle different regex group ordering
    
    return {
      amount: amountVal || parseFloat(hasAmount[1]),
      type: 'expense', // default guess, user will review
      cardLast4: null,
      merchant: 'Unrecognized SMS',
      referenceNumber: null,
      rawSms: smsText,
      confidence: 'low'
    };
  }

  return null; // Not a transaction
};

module.exports = {
  parseSms
};
