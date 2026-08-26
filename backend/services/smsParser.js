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
      const walletMatch = text.match(/على رقم محفظتك\s+(\d+)/i);
      if (!amountMatch) return null;
      return {
        amount: parseFloat(amountMatch[1]),
        type: 'income',
        merchant: merchantMatch ? merchantMatch[1].trim() : 'Vodafone Cash',
        cardLast4: walletMatch ? walletMatch[1].slice(-4) : null,
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

/**
 * Fallback to extract card last 4 digits from various patterns
 * @param {string} smsText 
 * @returns {string|null}
 */
const extractCardFallback = (smsText) => {
  // 1. Account number ending in XXXX
  let m = smsText.match(/ending\s*(?:in\s+|with\s+)?(\d{4})/i);
  if (m) return m[1];
  
  // 2. Arabic ending in XXXX
  m = smsText.match(/المنته.*?بـ?\s*(\d{4})/i);
  if (m) return m[1];

  // 3. Account/Wallet with full number
  m = smsText.match(/(?:حسابك|حساب رقم|رقم|محفظتك|بطاقة|بطاقتكم)[^\d]*(\d{11,16})/i);
  if (m) return m[1].slice(-4);

  // 4. Card directly
  m = smsText.match(/card\s*(\d{4})/i);
  if (m) return m[1];

  // 5. Masked numbers xxx1234 or ***1234
  m = smsText.match(/(?:x|\*){2,}(\d{4})/i);
  if (m) return m[1];

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

    const cardLast4 = extractCardFallback(smsText);
    
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
