/**
 * Dedicated Account Resolver for Finova
 *
 * Resolves account identifiers strictly against accounts owned by the authenticated user.
 * Implements Constitution Principle II: Zero-Guessing (returns null if missing, invalid, or ambiguous).
 */

const Account = require('../models/Account');

/**
 * Resolves an account strictly by its explicit 4 digits.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @param {string|null} accountLast4 - Exactly 4 digits extracted from verified context
 * @param {mongoose.ClientSession|null} session - Optional MongoDB transaction session
 * @returns {Promise<Object|null>} Resolved account document (lean) or null
 */
const resolveUserAccount = async (userId, accountLast4, session = null) => {
  if (!userId || !accountLast4 || typeof accountLast4 !== 'string') {
    return null;
  }

  const normalizedLast4 = accountLast4.trim();
  if (!/^\d{4}$/.test(normalizedLast4)) {
    return null;
  }

  const query = {
    user: userId,
    cardLast4: normalizedLast4,
    isArchived: { $ne: true }
  };

  const q = Account.find(query);
  if (session) {
    q.session(session);
  }

  const matchedAccounts = await q.lean();

  // Return the account ONLY when exactly one unambiguous match exists
  if (matchedAccounts.length === 1) {
    return matchedAccounts[0];
  }

  // 0 matches -> null (account not configured)
  // >1 matches -> null (ambiguous duplicate last-4; zero-guessing enforced)
  return null;
};

module.exports = {
  resolveUserAccount
};
