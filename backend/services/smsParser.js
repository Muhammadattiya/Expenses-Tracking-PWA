/**
 * SMS Parser Engine for Finova
 * 
 * This module is responsible for parsing financial SMS messages to extract transaction details.
 */

const BANK_PATTERNS = [
  // ==========================================
  // ARABIC - PREPAID / POS / TRANSFERS
  // ==========================================
  {
    // Pattern 1: Transfer Out (Expense) - Arabic
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
        cardLast4: null
      };
    }
  },
  {
    // Pattern 2: Transfer In (Income) - Arabic
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
    id: 'instapay_purchase_ar',
    match: /تم خصم مبلغ.*باستخدام شبكة المدفوعات اللحظية/i,
    extract: (text) => {
      const amountMatch = text.match(/خصم مبلغ\s+([\d.]+)\s*(جم|EGP)/i);
      const merchantMatch = text.match(/عند\s+(.*?)\s+يوم/i);
      const refMatch = text.match(/مرجع التاجر\s+(\d+)/i);
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

  // ==========================================
  // ENGLISH - SUCCESSFUL TX / IPN
  // ==========================================
  {
    // Pattern 5: Successful Transaction English
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
  },

  // ==========================================
  // VODAFONE CASH
  // ==========================================
  {
    id: 'vf_cash_transfer_sent_eng',
    match: /were successfully transferred to/i,
    extract: (text) => {
      const amountMatch = text.match(/([\d.]+)\s*L\.E were successfully transferred to/i);
      const merchantMatch = text.match(/transferred to\s+(\d+)/i);
      const refMatch = text.match(/Transaction ID:\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: merchantMatch ? merchantMatch[1] : 'Vodafone Cash',
        cardLast4: null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    id: 'vf_cash_recharge_eng',
    match: /was successfully recharged to your mobile/i,
    extract: (text) => {
      const amountMatch = text.match(/([\d.]+)\s*L\.E was successfully recharged/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'Mobile Recharge',
        cardLast4: null,
        referenceNumber: null
      };
    }
  },
  {
    id: 'vf_cash_payment_ar',
    match: /تم دفع مبلغ.*ل/i,
    extract: (text) => {
      const amountMatch = text.match(/تم دفع مبلغ\s*([\d.]+)\s*جنية/i);
      const merchantMatch = text.match(/ل([a-zA-Z0-9\s]+)\./i);
      const refMatch = text.match(/رقم العملية\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: merchantMatch ? merchantMatch[1].trim() : 'Vodafone Cash',
        cardLast4: null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    id: 'vf_cash_withdrawal_ar',
    match: /تم سحب.*من محفظة فودافون كاش/i,
    extract: (text) => {
      const amountMatch = text.match(/تم سحب\s*([\d.]+)\s*جنية/i);
      const refMatch = text.match(/رقم العملية;\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'Withdrawal',
        cardLast4: null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    id: 'vf_cash_received_ar',
    match: /تم استلام مبلغ.*على رقم محفظتك/i,
    extract: (text) => {
      const amountMatch = text.match(/تم استلام مبلغ\s*([\d.]+)\s*جنيه/i);
      const merchantMatch = text.match(/بإسم\s+([A-Za-z\s]+)\s+على/i) || text.match(/من\s+(\d+)\s+المسجل/i);
      const refMatch = text.match(/رقم العملية:\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: merchantMatch ? merchantMatch[1].trim() : 'Vodafone Cash',
        cardLast4: null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },

  // ==========================================
  // ADIB / BANQUE MISR / IPN (General)
  // ==========================================
  {
    id: 'adib_expense_ar',
    match: /تم خصم.*من حسابك/i,
    extract: (text) => {
      const amountMatch = text.match(/تم خصم\s+([\d.]+)\s*EGP/i);
      const accountMatch = text.match(/حسابك\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'ADIB Transaction',
        cardLast4: accountMatch ? accountMatch[1].slice(-4) : null,
        referenceNumber: null
      };
    }
  },
  {
    id: 'adib_ipn_expense_en',
    match: /Your account ending in.*has been charged.*for an IPN transfer/i,
    extract: (text) => {
      const amountMatch = text.match(/amount of\s+([\d.]+)/i);
      const accountMatch = text.match(/ending in\s+(\d{4})/i);
      const refMatch = text.match(/Txn Ref:\s*([a-zA-Z0-9]+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'IPN Transfer',
        cardLast4: accountMatch ? accountMatch[1] : null,
        referenceNumber: refMatch ? refMatch[1] : null
      };
    }
  },
  {
    id: 'banque_misr_pos_ar',
    match: /بطاقة بنك مصر.*تم الآن خصم.*عند/i,
    extract: (text) => {
      const amountMatch = text.match(/تم الآن خصم\s+([\d.]+)\s*EGP/i);
      const accountMatch = text.match(/بنك مصر.*?\*+(\d{4})/i);
      const merchantMatch = text.match(/عند\s+(.*?)\s+يوم/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: merchantMatch ? merchantMatch[1].trim() : 'Banque Misr POS',
        cardLast4: accountMatch ? accountMatch[1] : null,
        referenceNumber: null
      };
    }
  },
  {
    id: 'ipn_general_sent_ar',
    match: /تم تحويل مبلغ.*من حساب رقم.*عن طريق التحويل اللحظي/i,
    extract: (text) => {
      const amountMatch = text.match(/تم تحويل مبلغ\s*([\d.]+)\s*EGP/i);
      const accountMatch = text.match(/حساب رقم\s*xxx(\d{4})/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'expense',
        merchant: 'IPN Transfer',
        cardLast4: accountMatch ? accountMatch[1] : null,
        referenceNumber: null
      };
    }
  },
  {
    id: 'ipn_general_received_ar',
    match: /تم اضافة مبلغ.*الى حساب رقم.*عن طريق التحويل اللحظي/i,
    extract: (text) => {
      const amountMatch = text.match(/تم اضافة مبلغ\s*([\d.]+)\s*EGP/i);
      const accountMatch = text.match(/حساب رقم\s*xxx(\d{4})/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: 'IPN Transfer',
        cardLast4: accountMatch ? accountMatch[1] : null,
        referenceNumber: null
      };
    }
  },
  {
    id: 'adib_income_ar',
    match: /تم إضافة.*الى حسابك رقم/i,
    extract: (text) => {
      const amountMatch = text.match(/تم إضافة\s+([\d.]+)\s*EGP/i);
      const accountMatch = text.match(/حسابك رقم\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: 'ADIB Income',
        cardLast4: accountMatch ? accountMatch[1].slice(-4) : null,
        referenceNumber: null
      };
    }
  }
];

const normalizeArabicNumerals = (text) => {
  if (!text) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.split('').map(c => {
    const index = arabicNumbers.indexOf(c);
    return index !== -1 ? index : c;
  }).join('');
};

/**
 * Robust extraction of the card or account last 4 digits.
 * Applies priority rules and protections against false positives.
 * @param {string} smsText 
 * @returns {string|null}
 */
const extractCardLast4 = (smsText) => {
  if (!smsText) return null;
  
  // Normalize Arabic-Indic digits
  const text = normalizeArabicNumerals(smsText);

  // 1. High Confidence: Explicit prefixes
  let match;
  
  // "ending in 9596", "ending with 9596"
  match = text.match(/ending\s*(?:in|with)\s*(\d{4,16})(?:\s|$|\.|,)/i);
  if (match) return match[1].slice(-4);

  // "حساب رقم xxx6201" or "حسابك 100001269596" or "حسابك رقم 100001269596"
  match = text.match(/حساب(?:ك)?\s*(?:رقم)?\s*(?:[xX*\s-]*?)(\d{4,16})(?:\s|$|\.|,)/i);
  if (match) return match[1].slice(-4);

  // "بطاقة ... رقم 2513" or "بطاقة بنك مصر ***6614"
  match = text.match(/بطاقة\s*(?:[^\d]{0,30}?)\s*(?:رقم)?\s*(?:[xX*\s-]*?)(\d{4,16})(?:\s|$|\.|,)/i);
  if (match) return match[1].slice(-4);

  // "المنتهية بـ 1984"
  match = text.match(/المنتهي(?:ة)?\s*بـ?\s*(\d{4,16})(?:\s|$|\.|,)/i);
  if (match) return match[1].slice(-4);
  
  // "اخر 4 ارقام 1234"
  match = text.match(/(?:اخر 4 ارقام|آخر أربعة أرقام)\s*(\d{4})/i);
  if (match) return match[1];

  // English "card ****1234" or "account ****1234"
  match = text.match(/(?:card|account)(?:\s+(?:no\.?|number))?\s+(?:[^\d]{0,20}?)\s*(?:[xX*\s-]*?)(\d{4,16})(?:\s|$|\.|,)/i);
  if (match) return match[1].slice(-4);

  // 2. Medium Confidence: Masked formats
  // Must be directly preceded by at least two x, X, or * (e.g. ****1984, xx1984)
  const maskedRegex = /(?:[xX*]{2,}[\s-]*|x{2,}X*[\s-]*|X{2,}x*[\s-]*)(\d{4})(?:\s|$|\.|,)/gi;
  let maskedMatch;
  while ((maskedMatch = maskedRegex.exec(text)) !== null) {
    const preContext = text.slice(Math.max(0, maskedMatch.index - 20), maskedMatch.index);
    // Protect against masked reference numbers or IDs
    if (!/(?:Ref|رقم مرجعي|مرجع|Process|Transaction|Operation|عملية)/i.test(preContext)) {
      return maskedMatch[1];
    }
  }

  // No generic fallback to prevent false positives with amounts, phones, or IDs.
  return null;
};

/**
 * Fallback to extract amount without accidentally grabbing the available balance
 * @param {string} smsText 
 * @returns {number|null}
 */
const extractAmountFallback = (smsText) => {
  // Action keywords usually precede the actual transaction amount
  let m = smsText.match(/(?:مبلغ|بمبلغ|خصم|اضافة|إضافة|ايداع|سحب|دفع|تحويل|استلام|استلمت|charged.*?amount of|debited|purchase of|withdrawal of)\s*([\d.]+)\s*(?:جم|جنيه|EGP|L\.E)/i);
  if (m) return parseFloat(m[1]);

  // English variants
  m = smsText.match(/(?:amount of|EGP|L\.E)\s*([\d.]+)/i);
  if (m) return parseFloat(m[1]);

  // Last resort
  m = smsText.match(/([\d.]+)\s*(?:EGP|L\.E|جم|جنيه)/i);
  if (m) return parseFloat(m[1]);

  return null;
};

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
        if (!extracted.cardLast4) {
          extracted.cardLast4 = extractCardLast4(smsText);
        }
        return {
          ...extracted,
          rawSms: smsText,
          confidence: 'high'
        };
      }
    }
  }

  // ==========================================
  // SMART FALLBACK
  // ==========================================
  const amount = extractAmountFallback(smsText);
  const isFinancial = /(خصم|شراء|إيداع|ايداع|اضافة|إضافة|استلام|استلمت|تحويل|سحب|مبلغ|transaction|transfer|payment|paid|charged|recharged|purchase|debited|withdrawal)/i.test(smsText);

  if (amount && isFinancial) {
    let type = 'expense';
    if (/(إضافة|اضافة|إيداع|ايداع|استلام|استلمت|received|added)/i.test(smsText)) {
      type = 'income';
    }

    const cardLast4 = extractCardLast4(smsText);
    
    // Guess merchant from SMS text roughly if possible
    let merchant = 'Unrecognized SMS';
    let merchantMatch = smsText.match(/(?:عند|لـ|ل|to|@|at)\s*([a-zA-Z0-9\s*_-]+)(?:\s+يوم|\s+في|\s+on|,|\.)/i);
    if (merchantMatch && merchantMatch[1] && merchantMatch[1].trim().length > 2) {
      merchant = merchantMatch[1].trim();
    } else if (/فودافون كاش|vodafone cash/i.test(smsText)) {
      merchant = 'Vodafone Cash';
    } else if (/instapay|التحويل اللحظي/i.test(smsText)) {
      merchant = 'IPN Transfer';
    } else if (/qnb/i.test(smsText)) {
      merchant = 'QNB Transaction';
    }

    return {
      amount,
      type, 
      cardLast4,
      merchant,
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
