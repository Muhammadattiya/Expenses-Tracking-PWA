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
 * Builds the transactions CSV table string
 */
export const buildTransactionsCsvChunk = (transactions = []) => {
  const rows = transactions.map((t) => {
    const type = (t.type || 'expense').toLowerCase();
    const date = formatDateForCsv(t.date);
    const title = t.title || t.description || '';
    const amount = t.amount != null ? Number(t.amount) : 0;

    let account = '';
    let fromAccount = '';
    let toAccount = '';

    if (type === 'transfer') {
      fromAccount = typeof t.from_account === 'object' ? (t.from_account?.name || '') : (t.from_account || '');
      toAccount = typeof t.to_account === 'object' ? (t.to_account?.name || '') : (t.to_account || '');
    } else {
      account = typeof t.account === 'object' ? (t.account?.name || '') : (t.account || '');
    }

    const category = typeof t.category === 'object' ? (t.category?.name || '') : (t.category || '');
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

  return Papa.unparse({ fields: columns, data: rows }, { quotes: true, header: true });
};

/**
 * Builds the debts CSV table string
 */
export const buildDebtsCsvChunk = (debts = []) => {
  const rows = debts.map((d) => {
    const date = formatDateForCsv(d.createdAt || d.date);
    const personName = d.personName || d.name || '';
    const type = (d.type || 'i_owe').toLowerCase();
    const initialAmount = d.initialAmount != null ? Number(d.initialAmount) : (d.amount != null ? Number(d.amount) : 0);
    const remainingAmount = d.remainingAmount != null ? Number(d.remainingAmount) : initialAmount;
    const status = d.status || (remainingAmount <= 0 ? 'settled' : 'active');
    const notes = d.notes || '';

    return {
      Date: date,
      'Person Name': personName,
      Type: type,
      'Initial Amount': initialAmount,
      'Remaining Amount': remainingAmount,
      Status: status,
      Notes: notes
    };
  });

  const columns = [
    'Date',
    'Person Name',
    'Type',
    'Initial Amount',
    'Remaining Amount',
    'Status',
    'Notes'
  ];

  return Papa.unparse({ fields: columns, data: rows }, { quotes: true, header: true });
};

/**
 * Builds the budgets CSV table string with cycle progress
 */
export const buildBudgetsCsvChunk = (budgets = []) => {
  const rows = budgets.map((b) => {
    const categoryName = typeof b.category === 'object' ? (b.category?.name || '') : (b.category || '');
    const limit = b.amount != null ? Number(b.amount) : 0;
    const spent = b.spent != null ? Number(b.spent) : 0;
    const remaining = Math.max(limit - spent, 0);
    const progressPercent = limit > 0 ? `${Math.min(Math.round((spent / limit) * 100), 999)}%` : '0%';
    const period = b.period || 'monthly';

    return {
      Category: categoryName,
      'Budget Limit': limit,
      'Spent Amount': spent,
      'Remaining Amount': remaining,
      Progress: progressPercent,
      Period: period
    };
  });

  const columns = [
    'Category',
    'Budget Limit',
    'Spent Amount',
    'Remaining Amount',
    'Progress',
    'Period'
  ];

  return Papa.unparse({ fields: columns, data: rows }, { quotes: true, header: true });
};

/**
 * Converts transactions, debts, and budgets into a structured multi-section CSV with UTF-8 BOM
 */
export const generateTransactionsCsv = ({ transactions = [], debts = [], budgets = [] } = {}) => {
  const txChunk = buildTransactionsCsvChunk(transactions);
  const debtsChunk = buildDebtsCsvChunk(debts);
  const budgetsChunk = buildBudgetsCsvChunk(budgets);

  const sections = [
    '# --- TRANSACTIONS ---',
    txChunk,
    '',
    '# --- DEBTS ---',
    debtsChunk,
    '',
    '# --- BUDGETS ---',
    budgetsChunk
  ];

  const fullCsv = sections.join('\r\n');
  return '\uFEFF' + fullCsv;
};

/**
 * Triggers browser download of a CSV file
 */
export const downloadCsvFile = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || `finova_backup_${new Date().toISOString().split('T')[0]}.csv`);
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

// Helper: Find value from row matching aliases
const findRowValue = (row, aliases) => {
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

/**
 * Normalizes raw transaction rows
 */
export const normalizeTransactionRows = (rawRows = []) => {
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
    for (const [targetKey, aliases] of Object.entries(keyAliases)) {
      const val = findRowValue(row, aliases);
      if (val !== undefined) normalized[targetKey] = val;
    }
    return normalized;
  }).filter((row) => Object.keys(row).length > 0);
};

/**
 * Normalizes raw debt rows
 */
export const normalizeDebtRows = (rawRows = []) => {
  const keyAliases = {
    personName: ['personname', 'person', 'name', 'person_name', 'اسم الشخص', 'الشخص', 'الاسم'],
    type: ['type', 'debttype', 'debt_type', 'النوع', 'نوع الدين'],
    initialAmount: ['initialamount', 'initial_amount', 'amount', 'المبلغ الاصلي', 'المبلغ الأصلي', 'المبلغ'],
    remainingAmount: ['remainingamount', 'remaining_amount', 'remaining', 'المتبقي', 'المبلغ المتبقي'],
    status: ['status', 'debtstatus', 'الحالة', 'حالة الدين'],
    date: ['date', 'createdat', 'التاريخ', 'تاريخ الدين'],
    notes: ['notes', 'note', 'description', 'ملاحظات', 'ملاحظة', 'البيان']
  };

  return rawRows.map((row) => {
    const normalized = {};
    for (const [targetKey, aliases] of Object.entries(keyAliases)) {
      const val = findRowValue(row, aliases);
      if (val !== undefined) normalized[targetKey] = val;
    }
    return normalized;
  }).filter((row) => Object.keys(row).length > 0);
};

/**
 * Normalizes raw budget rows
 */
export const normalizeBudgetRows = (rawRows = []) => {
  const keyAliases = {
    category: ['category', 'categoryname', 'الفئة', 'التصنيف', 'القسم'],
    amount: ['budgetlimit', 'budget_limit', 'amount', 'الميزانية', 'الحد الاقصى', 'الحد الأقصى', 'المبلغ'],
    spent: ['spentamount', 'spent_amount', 'spent', 'المصروف', 'المبلغ المصروف'],
    period: ['period', 'budgetperiod', 'الفترة', 'دورة الميزانية']
  };

  return rawRows.map((row) => {
    const normalized = {};
    for (const [targetKey, aliases] of Object.entries(keyAliases)) {
      const val = findRowValue(row, aliases);
      if (val !== undefined) normalized[targetKey] = val;
    }
    return normalized;
  }).filter((row) => Object.keys(row).length > 0);
};

/**
 * Parses a section chunk with PapaParse
 */
const parseSectionData = (chunkText) => {
  if (!chunkText || chunkText.trim() === '') return [];
  const res = Papa.parse(chunkText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });
  return res.data || [];
};

/**
 * Normalize and parse an imported CSV file
 * Supports both multi-section (Transactions, Debts, Budgets) and legacy single-table CSVs
 */
export const parseAndNormalizeCsv = (csvText) => {
  if (!csvText || typeof csvText !== 'string') {
    return { transactions: [], debts: [], budgets: [], isMultiSection: false };
  }

  // Remove BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();

  // Check if text contains section markers
  const sectionRegex = /^#\s*---\s*(TRANSACTIONS|DEBTS|BUDGETS|المعاملات|الديون|الميزانيات)\s*---/im;
  const hasSections = sectionRegex.test(cleanText);

  if (!hasSections) {
    // Single table fallback: assume transactions
    const rawRows = parseSectionData(cleanText);
    const transactions = normalizeTransactionRows(rawRows);
    return {
      transactions,
      debts: [],
      budgets: [],
      isMultiSection: false
    };
  }

  // Split lines and group into sections
  const lines = cleanText.split(/\r?\n/);
  const sections = {
    transactions: [],
    debts: [],
    budgets: []
  };

  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#\s*---\s*(TRANSACTIONS|المعاملات)/i.test(trimmed)) {
      currentSection = 'transactions';
      continue;
    } else if (/^#\s*---\s*(DEBTS|الديون)/i.test(trimmed)) {
      currentSection = 'debts';
      continue;
    } else if (/^#\s*---\s*(BUDGETS|الميزانيات)/i.test(trimmed)) {
      currentSection = 'budgets';
      continue;
    }

    if (currentSection && sections[currentSection]) {
      sections[currentSection].push(line);
    }
  }

  const rawTransactions = parseSectionData(sections.transactions.join('\r\n'));
  const rawDebts = parseSectionData(sections.debts.join('\r\n'));
  const rawBudgets = parseSectionData(sections.budgets.join('\r\n'));

  return {
    transactions: normalizeTransactionRows(rawTransactions),
    debts: normalizeDebtRows(rawDebts),
    budgets: normalizeBudgetRows(rawBudgets),
    isMultiSection: true
  };
};
