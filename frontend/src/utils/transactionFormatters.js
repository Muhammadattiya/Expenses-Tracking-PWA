/**
 * Utility functions for localizing transaction titles, categories, and account names.
 */

const AR_TO_EN_TITLES = {
  'معاملة مستوردة': 'Imported Transaction',
  'معاملة بدون عنوان': 'Untitled Transaction',
  'معاملة بدون اسم': 'Untitled Transaction',
  'إيداع مدخرات': 'Savings Deposit',
  'سحب مدخرات': 'Savings Withdrawal',
  'إيداع في درع الطوارئ': 'Emergency Fund Deposit',
  'سحب من درع الطوارئ': 'Emergency Fund Withdrawal',
  'طعام وشراب': 'Food & Dining',
  'طعام': 'Food',
  'تسوق': 'Shopping',
  'فواتير': 'Bills & Utilities',
  'مواصلات': 'Transportation',
  'ترفيه': 'Entertainment',
  'صحة': 'Healthcare',
  'تعليم': 'Education',
  'سكن': 'Housing',
  'راتب': 'Salary',
  'مكافأة': 'Bonus',
  'استثمار': 'Investment',
  'استثمارات': 'Investments',
  'أخرى': 'Other',
  'تحويل': 'Transfer',
  'دين': 'Debt',
  'قسط': 'Installment',
  'سلفة': 'Loan'
};

const EN_TO_AR_TITLES = {
  'Imported Transaction': 'معاملة مستوردة',
  'Untitled Transaction': 'معاملة بدون عنوان',
  'Savings Deposit': 'إيداع مدخرات',
  'Savings Withdrawal': 'سحب مدخرات',
  'Emergency Fund Deposit': 'إيداع في درع الطوارئ',
  'Emergency Fund Withdrawal': 'سحب من درع الطوارئ',
  'Food & Dining': 'طعام وشراب',
  'Food': 'طعام',
  'Shopping': 'تسوق',
  'Bills & Utilities': 'فواتير',
  'Bills': 'فواتير',
  'Transportation': 'مواصلات',
  'Transport': 'مواصلات',
  'Entertainment': 'ترفيه',
  'Healthcare': 'صحة',
  'Health': 'صحة',
  'Education': 'تعليم',
  'Housing': 'سكن',
  'Salary': 'راتب',
  'Bonus': 'مكافأة',
  'Investment': 'استثمار',
  'Investments': 'استثمارات',
  'Other': 'أخرى',
  'Transfer': 'تحويل',
  'Debt': 'دين',
  'Installment': 'قسط'
};

const AR_TO_EN_ACCOUNTS = {
  'كاش': 'Cash',
  'نقدي': 'Cash',
  'نقد': 'Cash',
  'حساب بنكي': 'Bank',
  'حساب البنك': 'Bank',
  'بنك': 'Bank',
  'محفظة': 'Wallet',
  'محفظه': 'Wallet',
  'المحفظة': 'Wallet',
  'حساب ادخار': 'Savings',
  'حساب التوفير': 'Savings',
  'ادخار': 'Savings',
  'توفير': 'Savings',
  'استثمارات': 'Investments',
  'استثمار': 'Investments',
  'طوارئ': 'Emergency Fund',
  'درع الطوارئ': 'Emergency Shield',
  'احتياطي الطوارئ': 'Emergency Reserve',
  'حساب الطوارئ': 'Emergency Fund'
};

const EN_TO_AR_ACCOUNTS = {
  'Cash': 'كاش',
  'Bank': 'بنك',
  'Wallet': 'محفظة',
  'Savings': 'حساب ادخار',
  'Investments': 'استثمارات',
  'Emergency Fund': 'حساب الطوارئ',
  'Emergency Shield': 'درع الطوارئ',
  'Emergency Reserve': 'احتياطي الطوارئ'
};

export function formatAccountName(name, lang = 'ar') {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (lang !== 'ar') {
    return AR_TO_EN_ACCOUNTS[trimmed] || trimmed;
  } else {
    return EN_TO_AR_ACCOUNTS[trimmed] || trimmed;
  }
}

export function formatAccountType(type, t = null) {
  if (!type) return '';
  const lower = type.toLowerCase().trim();
  if (t) {
    if (lower === 'cash') return t('settings.cash') || 'Cash';
    if (lower === 'bank') return t('settings.bank') || 'Bank';
    if (lower === 'wallet') return t('settings.wallet') || 'Wallet';
    if (lower === 'investment' || lower === 'investments') return t('settings.investmentsAccount') || 'Investments';
  }
  return type;
}

export function formatTransactionTitle(transaction, lang = 'ar', t = null) {
  if (!transaction) return '';
  const rawTitle = (transaction.title || '').trim();
  const isAr = lang === 'ar';

  if (!isAr) {
    if (AR_TO_EN_TITLES[rawTitle]) {
      return AR_TO_EN_TITLES[rawTitle];
    }
    const matchSavings = rawTitle.match(/^إيداع في حساب الادخار\s*\((.+)\)$/);
    if (matchSavings) {
      const innerAcc = formatAccountName(matchSavings[1], 'en');
      return `Savings Deposit (${innerAcc})`;
    }
    if (rawTitle.startsWith('إيداع في حساب الادخار')) {
      return rawTitle.replace('إيداع في حساب الادخار', 'Savings Deposit');
    }
    if (rawTitle.startsWith('إيداع في هدف الادخار: ')) {
      return rawTitle.replace('إيداع في هدف الادخار: ', 'Goal Deposit: ');
    }
    const matchTo = rawTitle.match(/^تحويل إلى (.+)$/);
    if (matchTo) {
      return `Transfer to ${formatAccountName(matchTo[1], 'en')}`;
    }
    const matchFrom = rawTitle.match(/^تحويل من (.+)$/);
    if (matchFrom) {
      return `Transfer from ${formatAccountName(matchFrom[1], 'en')}`;
    }
    if (rawTitle.startsWith('سداد قسط: ')) {
      return rawTitle.replace('سداد قسط: ', 'Installment: ');
    }
    if (rawTitle.startsWith('سداد دين: ')) {
      return rawTitle.replace('سداد دين: ', 'Debt Repayment: ');
    }
    if (rawTitle.startsWith('دين: ')) {
      return rawTitle.replace('دين: ', 'Debt: ');
    }
    if (rawTitle.startsWith('قسط: ')) {
      return rawTitle.replace('قسط: ', 'Installment: ');
    }
    if (rawTitle.startsWith('تسوية (مدفوع): ')) {
      const prefix = t ? t('transactions.settlementPaid') : 'Settlement (Paid)';
      return `${prefix}: ${rawTitle.replace('تسوية (مدفوع): ', '')}`;
    }
    if (rawTitle.startsWith('تسوية (مستلم): ')) {
      const prefix = t ? t('transactions.settlementReceived') : 'Settlement (Received)';
      return `${prefix}: ${rawTitle.replace('تسوية (مستلم): ', '')}`;
    }
  } else {
    if (EN_TO_AR_TITLES[rawTitle]) {
      return EN_TO_AR_TITLES[rawTitle];
    }
    if (rawTitle.startsWith('Installment: ')) {
      return rawTitle.replace('Installment: ', 'سداد قسط: ');
    }
    if (rawTitle.startsWith('Debt Repayment: ')) {
      return rawTitle.replace('Debt Repayment: ', 'سداد دين: ');
    }
    if (rawTitle.startsWith('Debt: ')) {
      return rawTitle.replace('Debt: ', 'دين: ');
    }
    const matchSavingsEn = rawTitle.match(/^Savings Deposit:\s*(.+)$/);
    if (matchSavingsEn) {
      const innerAcc = formatAccountName(matchSavingsEn[1], 'ar');
      return `إيداع في حساب الادخار (${innerAcc})`;
    }
    if (rawTitle.startsWith('Savings Deposit: ')) {
      return rawTitle.replace('Savings Deposit: ', 'إيداع في حساب الادخار: ');
    }
    if (rawTitle.startsWith('Goal Deposit: ')) {
      return rawTitle.replace('Goal Deposit: ', 'إيداع في هدف الادخار: ');
    }
    const matchToEn = rawTitle.match(/^Transfer to (.+)$/);
    if (matchToEn) {
      return `تحويل إلى ${formatAccountName(matchToEn[1], 'ar')}`;
    }
    const matchFromEn = rawTitle.match(/^Transfer from (.+)$/);
    if (matchFromEn) {
      return `تحويل من ${formatAccountName(matchFromEn[1], 'ar')}`;
    }
  }

  if (rawTitle) return rawTitle;

  // Fallback to category name if available
  const categoryObj = transaction.category && typeof transaction.category === 'object' ? transaction.category : null;
  if (categoryObj) {
    const catName = isAr
      ? (categoryObj.nameAr || categoryObj.name || categoryObj.nameEn)
      : (categoryObj.nameEn || categoryObj.name || categoryObj.nameAr);
    if (catName) {
      return !isAr && AR_TO_EN_TITLES[catName] ? AR_TO_EN_TITLES[catName] : catName;
    }
  }

  // Fallback to transaction type
  if (transaction.type === 'transfer') {
    return t ? t('transactions.transfer') : (isAr ? 'تحويل' : 'Transfer');
  }
  if (transaction.type === 'income') {
    return t ? t('transactions.income') : (isAr ? 'دخل' : 'Income');
  }
  if (transaction.type === 'expense') {
    return t ? t('transactions.expense') : (isAr ? 'مصروف' : 'Expense');
  }

  return t ? t('transactions.uncategorized') : (isAr ? 'بدون تصنيف' : 'Uncategorized');
}
