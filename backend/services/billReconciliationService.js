const Bill = require('../models/Bill');
const billService = require('./billService');

/**
 * Matches an incoming transaction against active unpaid bills.
 * If a matching bill is found within timing (+/- 7 days) and amount (+/- 10%) thresholds,
 * atomically marks the bill as paid linked to the transaction.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Object} transaction
 * @returns {Promise<{ matched: boolean, bill: Object|null }>}
 */
const matchAndReconcileBill = async (userId, transaction) => {
  if (!transaction || transaction.type !== 'expense' || !transaction.amount) {
    return { matched: false, bill: null };
  }

  const txAmount = Number(transaction.amount);
  if (isNaN(txAmount) || txAmount <= 0) {
    return { matched: false, bill: null };
  }

  const txTitle = (transaction.title || '').toLowerCase().trim();
  const txDate = transaction.date ? new Date(transaction.date) : new Date();

  // Find active unpaid bills for this user
  const bills = await Bill.find({
    user: userId,
    status: { $in: ['upcoming', 'due_today', 'overdue'] },
    isActive: { $ne: false }
  });

  for (const bill of bills) {
    const billDueDate = new Date(bill.dueDate);
    const dayDiff = Math.abs(txDate.getTime() - billDueDate.getTime()) / (1000 * 60 * 60 * 24);

    // 1. Timing window: within +/- 7 days of due date
    if (dayDiff > 7) continue;

    // 2. Amount match: exact or within 10% tolerance for variable utility bills
    const expected = Number(bill.expectedAmount);
    if (!expected || expected <= 0) continue;

    const amountDiff = Math.abs(expected - txAmount);
    const isAmountMatch = amountDiff <= 0.01 || (amountDiff / expected) <= 0.10;
    if (!isAmountMatch) continue;

    // 3. Keyword or Name match
    const billName = (bill.name || '').toLowerCase().trim();
    const hasKeywordMatch = Array.isArray(bill.keywords) && bill.keywords.some(kw => 
      kw && txTitle.includes(kw.trim().toLowerCase())
    );
    const hasNameMatch = billName && (txTitle.includes(billName) || billName.includes(txTitle));

    if (hasKeywordMatch || hasNameMatch) {
      // High-confidence match: atomically mark bill as paid
      await billService.markAsPaid(userId, bill._id, String(transaction._id));
      return { matched: true, bill };
    }
  }

  return { matched: false, bill: null };
};

module.exports = {
  matchAndReconcileBill
};
