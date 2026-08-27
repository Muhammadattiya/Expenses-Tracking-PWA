const Investment = require('../models/Investment');
const Account = require('../models/Account');
const AppError = require('../utils/AppError');
const transactionService = require('./transactionService');

const getGoldPrice = async () => {
  if (!process.env.GOLD_API_KEY) throw new AppError('Gold price service is not configured.', 503);
  const apiKey = encodeURIComponent(process.env.GOLD_API_KEY);
  const getPrice = async (symbol) => {
    const response = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`);
    const data = await response.json();
    const price = Number(data.price);
    if (!response.ok || !Number.isFinite(price)) throw new AppError(data.message || `Unable to retrieve ${symbol}.`, 502);
    return price;
  };
  const [goldPerOunceUsd, usdToEgp] = await Promise.all([getPrice('XAU/USD'), getPrice('USD/EGP')]);
  const perGram24 = (goldPerOunceUsd / 31.1034768) * usdToEgp;
  return { currency: 'EGP', usdToEgp, perGram24, perGram21: perGram24 * (21 / 24), updatedAt: new Date() };
};

const list = (userId) => Investment.find({ user: userId }).sort({ purchasedAt: -1 }).lean();
const create = async (userId, input) => {
  const safeData = {};
  const ALLOWED_KEYS = ['type', 'name', 'quantity', 'symbol', 'currency', 'karat', 'purchasePrice', 'currentPrice', 'purchasedAt', 'notes'];
  for (const key of ALLOWED_KEYS) {
    if (input[key] !== undefined) safeData[key] = input[key];
  }
  const investment = await Investment.create({ ...safeData, user: userId });

  // If a source account is provided, create a transfer transaction
  if (input.from_account) {
    const totalAmount = (Number(safeData.quantity) || 0) * (Number(safeData.purchasePrice) || 0);
    if (totalAmount > 0) {
      const transactionTitle = input.transferTitle || `Investment: ${safeData.name}`;
      const invAccount = await Account.findOne({ user: userId, type: 'investment' });
      await transactionService.createTransaction(userId, {
        type: 'transfer',
        amount: totalAmount,
        from_account: input.from_account,
        to_account: invAccount ? invAccount._id : undefined,
        investment: investment._id,
        title: transactionTitle,
        date: safeData.purchasedAt || new Date()
      });
    }
  }

  return investment;
};
const remove = async (userId, id) => {
  const investment = await Investment.findOneAndDelete({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);
};
const update = async (userId, id, input) => {
  const safeData = {};
  const ALLOWED_KEYS = ['type', 'name', 'quantity', 'symbol', 'currency', 'karat', 'purchasePrice', 'currentPrice', 'purchasedAt', 'notes'];
  for (const key of ALLOWED_KEYS) {
    if (input[key] !== undefined) safeData[key] = input[key];
  }
  const investment = await Investment.findOneAndUpdate({ _id: id, user: userId }, safeData, { new: true });
  if (!investment) throw new AppError('Investment not found.', 404);
  return investment;
};

module.exports = { getGoldPrice, list, create, update, remove };
