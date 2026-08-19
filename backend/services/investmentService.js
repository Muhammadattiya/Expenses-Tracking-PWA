const Investment = require('../models/Investment');
const AppError = require('../utils/AppError');

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
const create = (userId, input) => {
  const safeData = {};
  const ALLOWED_KEYS = ['type', 'name', 'weight', 'karat', 'purchasePrice', 'purchasedAt', 'notes'];
  for (const key of ALLOWED_KEYS) {
    if (input[key] !== undefined) safeData[key] = input[key];
  }
  return Investment.create({ ...safeData, user: userId });
};
const remove = async (userId, id) => {
  const investment = await Investment.findOneAndDelete({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);
};
module.exports = { getGoldPrice, list, create, remove };
