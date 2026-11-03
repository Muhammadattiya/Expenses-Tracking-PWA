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
    const newPrice = { currency: 'EGP', usdToEgp, perGram24, perGram21: perGram24 * (21 / 24), perGram18: perGram24 * (18 / 24), updatedAt: now };

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

const list = (userId) => Investment.find({ user: userId, isSold: { $ne: true } }).sort({ purchasedAt: -1 }).lean();

const create = async (userId, input) => {
  const safeData = {};
  const ALLOWED_KEYS = ['type', 'name', 'quantity', 'symbol', 'currency', 'karat', 'purchasePrice', 'currentPrice', 'purchasedAt', 'notes'];
  for (const key of ALLOWED_KEYS) {
    if (input[key] !== undefined) safeData[key] = input[key];
  }

  const initialPurchase = {
    quantity: Number(safeData.quantity) || 0,
    price: Number(safeData.purchasePrice) || 0,
    date: safeData.purchasedAt || new Date(),
    from_account: input.from_account || null
  };

  const investment = await Investment.create({
    ...safeData,
    user: userId,
    purchases: [initialPurchase]
  });

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
          color: '#8D6346',
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
      const tx = await transactionService.createTransaction(userId, {
        type: 'transfer',
        amount: totalAmount,
        from_account: input.from_account,
        to_account: invAccount._id,
        investment: investment._id,
        title: transactionTitle,
        date: safeData.purchasedAt || new Date()
      });

      if (investment.purchases && investment.purchases[0]) {
        investment.purchases[0].transactionId = tx._id;
        await investment.save();
      }
    }
  }

  return investment;
};

const buyMore = async (userId, id, input = {}) => {
  if (!userId) throw new AppError('User ID is required.', 400);
  const investment = await Investment.findOne({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);
  if (investment.isSold) throw new AppError('Cannot add to a sold investment.', 400);

  const newQty = Number(input.quantity);
  const newPrice = Number(input.purchasePrice);
  if (!Number.isFinite(newQty) || newQty <= 0) throw new AppError('Invalid quantity.', 400);
  if (!Number.isFinite(newPrice) || newPrice <= 0) throw new AppError('Invalid price.', 400);

  const currentQty = Number(investment.quantity) || 0;
  const currentPrice = Number(investment.purchasePrice) || 0;

  const totalQty = Math.round((currentQty + newQty) * 100000000) / 100000000;
  const totalCost = (currentQty * currentPrice) + (newQty * newPrice);
  const weightedAvgPrice = Math.round((totalCost / totalQty) * 10000) / 10000;

  let transactionId = null;
  if (input.from_account) {
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
        color: '#8D6346',
        isSystemAccount: true,
        excludeFromTotal: true
      });
    }

    const txAmount = Math.round((newQty * newPrice) * 100) / 100;
    const txTitle = input.title || `Buy: ${investment.name}`;
    const tx = await transactionService.createTransaction(userId, {
      type: 'transfer',
      amount: txAmount,
      from_account: input.from_account,
      to_account: invAccount._id,
      investment: investment._id,
      title: txTitle,
      date: input.purchasedAt || new Date()
    });
    transactionId = tx._id;
  }

  // Ensure initial purchases batch exists if legacy record didn't have one
  if (!Array.isArray(investment.purchases) || investment.purchases.length === 0) {
    investment.purchases = [{
      quantity: currentQty,
      price: currentPrice,
      date: investment.purchasedAt || investment.createdAt || new Date(),
    }];
  }

  investment.purchases.push({
    quantity: newQty,
    price: newPrice,
    date: input.purchasedAt || new Date(),
    from_account: input.from_account || null,
    transactionId
  });

  investment.quantity = totalQty;
  investment.purchasePrice = weightedAvgPrice;
  if (input.currentPrice) investment.currentPrice = Number(input.currentPrice);

  await investment.save();
  return investment;
};

const updateBatch = async (userId, id, batchId, input = {}) => {
  if (!userId) throw new AppError('User ID is required.', 400);
  const investment = await Investment.findOne({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);

  // If purchases is empty (legacy), initialize it
  if (!Array.isArray(investment.purchases) || investment.purchases.length === 0) {
    investment.purchases = [{
      quantity: investment.quantity,
      price: investment.purchasePrice,
      date: investment.purchasedAt || new Date()
    }];
  }

  const batch = investment.purchases.id(batchId);
  if (!batch) throw new AppError('Batch not found.', 404);

  const newQty = input.quantity !== undefined ? Number(input.quantity) : batch.quantity;
  const newPrice = input.price !== undefined ? Number(input.price) : batch.price;
  if (!Number.isFinite(newQty) || newQty <= 0) throw new AppError('Invalid quantity.', 400);
  if (!Number.isFinite(newPrice) || newPrice <= 0) throw new AppError('Invalid price.', 400);

  batch.quantity = newQty;
  batch.price = newPrice;
  if (input.date) batch.date = new Date(input.date);

  // Update linked transaction amount if one exists
  if (batch.transactionId) {
    try {
      const newAmount = Math.round(newQty * newPrice * 100) / 100;
      await transactionService.updateTransaction(userId, batch.transactionId, {
        amount: newAmount,
        date: batch.date
      });
    } catch (e) {
      console.warn('Failed to update linked transaction for batch:', e.message);
    }
  }

  // Recalculate total quantity and weighted average
  let sumQty = 0;
  let sumCost = 0;
  for (const p of investment.purchases) {
    sumQty += Number(p.quantity);
    sumCost += Number(p.quantity) * Number(p.price);
  }

  investment.quantity = Math.round(sumQty * 100000000) / 100000000;
  investment.purchasePrice = sumQty > 0 ? Math.round((sumCost / sumQty) * 10000) / 10000 : 0;

  await investment.save();
  return investment;
};

const deleteBatch = async (userId, id, batchId, options = {}) => {
  if (!userId) throw new AppError('User ID is required.', 400);
  const investment = await Investment.findOne({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);

  if (!Array.isArray(investment.purchases) || investment.purchases.length === 0) {
    throw new AppError('No batches found on this investment.', 400);
  }

  const batch = investment.purchases.id(batchId);
  if (!batch) throw new AppError('Batch not found.', 404);

  if (investment.purchases.length === 1) {
    throw new AppError('Cannot delete the only batch. Please delete the entire investment instead.', 400);
  }

  // Reverse linked transaction if requested and exists
  if (options.revertTransaction && batch.transactionId) {
    try {
      await transactionService.deleteTransaction(userId, batch.transactionId);
    } catch (e) {
      console.warn('Failed to delete linked transaction for batch:', e.message);
    }
  }

  batch.deleteOne();

  // Recalculate total quantity and weighted average
  let sumQty = 0;
  let sumCost = 0;
  for (const p of investment.purchases) {
    sumQty += Number(p.quantity);
    sumCost += Number(p.quantity) * Number(p.price);
  }

  investment.quantity = Math.round(sumQty * 100000000) / 100000000;
  investment.purchasePrice = sumQty > 0 ? Math.round((sumCost / sumQty) * 10000) / 10000 : 0;

  await investment.save();
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

const sell = async (userId, id, input = {}) => {
  if (!userId) throw new AppError('User ID is required.', 400);
  const investment = await Investment.findOne({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);

  const quantityToSell = Number(input.quantity);
  const availableQuantity = Number(investment.quantity);
  if (!Number.isFinite(quantityToSell) || quantityToSell <= 0 || quantityToSell > availableQuantity) {
    throw new AppError('Invalid sell quantity. It must be greater than zero and cannot exceed your holdings.', 400);
  }

  const sellPrice = Number(input.sellPrice);
  if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
    throw new AppError('Sell price must be greater than zero.', 400);
  }

  const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const totalProceeds = roundMoney(quantityToSell * sellPrice);
  const costBasis = roundMoney(quantityToSell * Number(investment.purchasePrice));
  const realizedPnL = roundMoney(totalProceeds - costBasis);
  let transferTx = null;

  if (input.to_account && totalProceeds > 0) {
    const targetAccount = await Account.findOne({ _id: input.to_account, user: userId });
    if (!targetAccount) throw new AppError('Destination account not found.', 404);
    if (targetAccount.isArchived) throw new AppError('Destination account is archived.', 400);
    if (targetAccount.type === 'investment' || targetAccount.isSystemAccount) {
      throw new AppError('Sale proceeds cannot be deposited into the investment account.', 400);
    }

    let investmentAccount = await Account.findOne({ user: userId, type: 'investment' });
    if (!investmentAccount) {
      investmentAccount = await Account.create({
        user: userId, name: 'Investments', type: 'investment', icon: 'TrendingUp',
        color: '#8D6346', isSystemAccount: true, excludeFromTotal: true,
      });
    }

    transferTx = await transactionService.createTransaction(userId, {
      type: 'transfer', amount: totalProceeds, from_account: investmentAccount._id,
      to_account: targetAccount._id, investment: investment._id,
      title: input.notes || `Sale: ${investment.name}`,
      date: input.date || new Date(), source: 'system',
    });
  }

  const remainingQuantity = Math.round((availableQuantity - quantityToSell) * 100000000) / 100000000;
  if (remainingQuantity <= 0.00000001) {
    // Preserve the holding and every linked transaction as immutable financial history.
    // A sold holding is simply hidden from active portfolio lists.
    investment.quantity = 0;
    investment.isSold = true;
    investment.soldAt = input.date || new Date();
    await investment.save();
    return { message: 'Investment fully sold.', soldOut: true, realizedPnL, totalProceeds, transaction: transferTx };
  }

  investment.quantity = remainingQuantity;
  await investment.save();
  return { message: 'Investment partially sold.', soldOut: false, investment, realizedPnL, totalProceeds, transaction: transferTx };
};

module.exports = { getGoldPrice, list, create, update, remove, sell, buyMore, updateBatch, deleteBatch };
