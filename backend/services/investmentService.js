const Investment = require('../models/Investment');
const Account = require('../models/Account');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const transactionService = require('./transactionService');

const getGoldPrice = async (userId) => {
  if (!userId) throw new AppError('User ID is required.', 400);
  
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  
  let { date, count, lastPrice } = user.goldApiLimit || {};

  if (date !== todayStr) {
    date = todayStr;
    count = 0;
  }

  // Rate limit: Max 5 times per day
  if (count >= 5) {
    if (lastPrice) {
      return lastPrice; // Return cached price if limit reached
    }
    throw new AppError('Daily limit for fetching gold price reached (5/5). Please try again tomorrow.', 429);
  }

  if (!process.env.GOLD_API_KEY) {
    if (lastPrice) return lastPrice;
    throw new AppError('Gold price service is not configured.', 503);
  }
  
  const apiKey = encodeURIComponent(process.env.GOLD_API_KEY);
  
  try {
    const getPrice = async (symbol) => {
      const response = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`);
      const data = await response.json();
      const price = Number(data.price);
      if (!response.ok || !Number.isFinite(price)) throw new AppError(data.message || `Unable to retrieve ${symbol}.`, 502);
      return price;
    };
    
    const [goldPerOunceUsd, usdToEgp] = await Promise.all([getPrice('XAU/USD'), getPrice('USD/EGP')]);
    const perGram24 = (goldPerOunceUsd / 31.1034768) * usdToEgp;
    const newPrice = { currency: 'EGP', usdToEgp, perGram24, perGram21: perGram24 * (21 / 24), updatedAt: now };

    user.goldApiLimit = {
      date: todayStr,
      count: count + 1,
      lastPrice: newPrice
    };
    await user.save();

    return newPrice;
  } catch (error) {
    if (lastPrice) {
      return lastPrice;
    }
    throw error;
  }
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
      let invAccount = await Account.findOne({ 
        user: userId, 
        $or: [{ type: 'investment' }, { name: 'Investments' }, { name: 'استثمارات' }] 
      });
      if (!invAccount) {
        invAccount = await Account.create({
          user: userId,
          name: 'Investments',
          type: 'investment',
          icon: 'TrendingUp',
          color: '#eab308',
          isSystemAccount: true,
          excludeFromTotal: true
        });
      } else if (invAccount.type !== 'investment') {
        invAccount.type = 'investment';
        invAccount.isSystemAccount = true;
        invAccount.excludeFromTotal = true;
        await invAccount.save();
      }

      const transactionTitle = input.transferTitle || input.title || `Investment: ${safeData.name}`;
      await transactionService.createTransaction(userId, {
        type: 'transfer',
        amount: totalAmount,
        from_account: input.from_account,
        to_account: invAccount._id,
        investment: investment._id,
        title: transactionTitle,
        date: safeData.purchasedAt || new Date()
      });
    }
  }

  return investment;
};
const remove = async (userId, id, options = {}) => {
  const investment = await Investment.findOne({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);

  const Transaction = require('../models/Transaction');
  const linkedTxs = await Transaction.find({ investment: id, user: userId });

  if (options.revertTransaction) {
    for (const tx of linkedTxs) {
      await transactionService.deleteTransaction(userId, tx._id);
    }
  } else if (linkedTxs.length > 0) {
    await Transaction.updateMany({ investment: id, user: userId }, { $unset: { investment: 1 } });
  }

  await Investment.deleteOne({ _id: id, user: userId });
};
const update = async (userId, id, input) => {
  const safeData = {};
  const ALLOWED_KEYS = ['type', 'name', 'quantity', 'symbol', 'currency', 'karat', 'purchasePrice', 'currentPrice', 'purchasedAt', 'notes'];
  for (const key of ALLOWED_KEYS) {
    if (input[key] !== undefined) safeData[key] = input[key];
  }
  const investment = await Investment.findOneAndUpdate({ _id: id, user: userId }, safeData, { returnDocument: 'after' });
  if (!investment) throw new AppError('Investment not found.', 404);
  return investment;
};

module.exports = { getGoldPrice, list, create, update, remove };
