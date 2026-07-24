/**
 * SMS Parser Engine for Finova
 * 
 * This module is responsible for parsing financial SMS messages to extract transaction details.
 * Note: Currently calibrated against 3 specific templates from a prepaid card issuer.
 * Other banks/issuers will require adding new patterns to the BANK_PATTERNS array.
 */

const BANK_PATTERNS = [
  {
    // Pattern 1: Transfer Out (Expense)
    // Example: تم تنفيذ تحويل لحظي من بطاقتكم مسبقة الدفع بمبلغ 104.00 جم إلى NOUR H**** Z****** S***** رقم مرجعي 102014695024 يوم 07-22 الساعة 09:57 للمزيد اتصل بـ 19623
    id: 'prepaid_transfer_out',
    match: /تم تنفيذ تحويل لحظي.*بمبلغ/i,
    extract: (text) => {
      const amountMatch = text.match(/بمبلغ\s+([\d.]+)\s*(جم|EGP)/i);
      const counterpartyMatch = text.match(/إلى\s+(.*?)\s+رقم مرجعي/i);
      const refMatch = text.match(/رقم مرجعي\s+(\d+)/i);
      
      if (!amountMatch) return null;
      
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: counterpartyMatch ? counterpartyMatch[1].trim() : null,
        referenceNumber: refMatch ? refMatch[1] : null,
        cardLast4: null // Not present in this SMS template
      };
    }
  },
  {
    // Pattern 2: Transfer In (Income)
    // Example: تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 1000.00 جم من محمد علاء حسن حسين ابوعيطه رقم مرجعي 165921364018 يوم 07-21 الساعة 23:40 للمزيد اتصل بـ 19623
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
    // Pattern 3: Purchase / POS (Expense)
    // Example: تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE       C  يوم 20/07/26  الساعه 10:42  المتاح 1593.2EGP للمزيد إتصل ب ١٩٦٢٣
    id: 'prepaid_purchase',
    match: /تم خصم.*من بطاقة/i,
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
        referenceNumber: null // Usually no explicit reference number in this template
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
  const hasAmount = smsText.match(/([\d.]+)\s*(جم|EGP)/i);
  const isFinancial = /(خصم|شراء|إيداع|تحويل|سحب|مبلغ)/i.test(smsText);

  if (hasAmount && isFinancial) {
    return {
      amount: parseFloat(hasAmount[1]),
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
