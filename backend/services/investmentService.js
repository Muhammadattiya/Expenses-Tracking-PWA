const Investment = require('../models/Investment');
const AppError = require('../utils/AppError');

const getGoldPrice = async () => {
  if (!process.env.GOLD_API_KEY) throw new AppError('Gold price service is not configured.', 503);
  const response = await fetch(`https://api.twelvedata.com/price?symbol=XAU%2FUSD&apikey=${encodeURIComponent(process.env.GOLD_API_KEY)}`);
  if (!response.ok) throw new AppError('Unable to retrieve the current gold price.', 502);
  const data = await response.json();
  const price = Number(data.price);
  if (!Number.isFinite(price)) throw new AppError(data.message || 'The gold price provider did not return a valid price.', 502);
  return { currency: 'EGP', perOunce: price, perGram: price / 31.1034768, updatedAt: new Date() };
};

const list = (userId) => Investment.find({ user: userId }).sort({ purchasedAt: -1 });
const create = (userId, input) => Investment.create({ ...input, user: userId });
const remove = async (userId, id) => {
  const investment = await Investment.findOneAndDelete({ _id: id, user: userId });
  if (!investment) throw new AppError('Investment not found.', 404);
};
module.exports = { getGoldPrice, list, create, remove };
