import Papa from 'papaparse';

/**
 * Format a date value into YYYY-MM-DD
 */
export const formatDateForCsv = (dateValue) => {
  if (!dateValue) return '';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateValue);
  }
};

/**
 * Converts transactions from backup format into clean tabular CSV rows
 * @param {Object} backupData - Object containing { transactions, accounts, categories }
 * @returns {string} - CSV string with UTF-8 BOM
 */
export const generateTransactionsCsv = (backupData) => {
  const transactions = Array.isArray(backupData)
    ? backupData
    : backupData?.transactions || [];

  const rows = transactions.map((t) => {
    const type = (t.type || 'expense').toLowerCase();
    const date = formatDateForCsv(t.date);
    const title = t.title || t.description || '';
    const amount = t.amount != null ? Number(t.amount) : 0;
    
    // Account resolving
    let account = '';
    let fromAccount = '';
    let toAccount = '';

    if (type === 'transfer') {
      fromAccount = typeof t.from_account === 'object' ? (t.from_account?.name || '') : (t.from_account || '');
      toAccount = typeof t.to_account === 'object' ? (t.to_account?.name || '') : (t.to_account || '');
    } else {
      account = typeof t.account === 'object' ? (t.account?.name || '') : (t.account || '');
    }

    // Category resolving
    const category = typeof t.category === 'object' ? (t.category?.name || '') : (t.category || '');

    // Investment resolving if present
    const investment = typeof t.investment === 'object' ? (t.investment?.name || t.investment?.symbol || '') : (t.investment || '');

    return {
      Date: date,
      Title: title,
      Type: type,
      Amount: amount,
      Category: category,
      Account: account,
      'From Account': fromAccount,
      'To Account': toAccount,
      Investment: investment,
    };
  });

  const columns = [
    'Date',
    'Title',
    'Type',
    'Amount',
    'Category',
    'Account',
    'From Account',
    'To Account',
    'Investment'
  ];

  const csvString = Papa.unparse({
    fields: columns,
    data: rows
  }, {
    quotes: true,
    header: true
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel properly renders Arabic characters
  return '\uFEFF' + csvString;
};

/**
 * Triggers browser download of a CSV file
 */
export const downloadCsvFile = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || `finova_transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Triggers browser download of a JSON backup file
 */
export const downloadJsonFile = (jsonData, fileName) => {
  const dataStr = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || `finova_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Normalize and parse an imported CSV file using PapaParse
 * Maps varied headers (English, Arabic, case variations) to standard schema
 */
export const parseAndNormalizeCsv = (csvText) => {
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });

  if (parseResult.errors && parseResult.errors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
    throw new Error('Failed to parse CSV file: ' + (parseResult.errors[0]?.message || 'Invalid format'));
  }

  const rawRows = parseResult.data || [];
  if (rawRows.length === 0) {
    return [];
  }

  // Header normalization dictionary
  const keyAliases = {
    date: ['date', 'datetime', 'createdat', 'التاريخ', 'تاريخ'],
    title: ['title', 'description', 'label', 'notes', 'note', 'العنوان', 'الوصف', 'بيان', 'ملاحظات'],
    type: ['type', 'transactiontype', 'transaction_type', 'kind', 'النوع', 'نوع المعاملة', 'نوع'],
    amount: ['amount', 'amountegp', 'amount_egp', 'value', 'total', 'المبلغ', 'القيمة', 'المجموع'],
    category: ['category', 'categoryname', 'الفئة', 'التصنيف', 'القسم'],
    account: ['account', 'accountname', 'الحساب', 'اسم الحساب'],
    from_account: ['from_account', 'fromaccount', 'from account', 'من حساب', 'من_حساب', 'الحساب المحول منه'],
    to_account: ['to_account', 'toaccount', 'to account', 'إلى حساب', 'الى حساب', 'إلى_حساب', 'الى_حساب', 'الحساب المحول إليه']
  };

  return rawRows.map((row) => {
    const normalized = {};

    // Helper to find matching key in row
    const findValue = (targetKey) => {
      const aliases = keyAliases[targetKey] || [targetKey];
      for (const [key, val] of Object.entries(row)) {
        const cleanedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
        for (const alias of aliases) {
          const cleanedAlias = alias.toLowerCase().replace(/[\s_-]+/g, '');
          if (cleanedKey === cleanedAlias && val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      return undefined;
    };

    const date = findValue('date');
    const title = findValue('title');
    const type = findValue('type');
    const amount = findValue('amount');
    const category = findValue('category');
    const account = findValue('account');
    const fromAccount = findValue('from_account');
    const toAccount = findValue('to_account');

    if (date) normalized.date = date;
    if (title) normalized.title = title;
    if (type) normalized.type = type;
    if (amount !== undefined) normalized.amount = amount;
    if (category) normalized.category = category;
    if (account) normalized.account = account;
    if (fromAccount) normalized.from_account = fromAccount;
    if (toAccount) normalized.to_account = toAccount;

    return normalized;
  }).filter((row) => Object.keys(row).length > 0);
};
