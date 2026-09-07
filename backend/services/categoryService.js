const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const { classifyCategoryIntent } = require("./categoryIntentClassifier");
const { INTENTS } = require("./quickAdd/intentTaxonomy");

const getCategories = async (userId) => {
  return Category.find({ user: userId }).sort({ type: 1, name: 1 }).lean();
};

// Whitelist allowed fields to prevent mass assignment
const CATEGORY_ALLOWED_KEYS = ['name', 'type', 'icon', 'color', 'intentId'];
const pickCategoryFields = (data) => {
  const safe = {};
  for (const key of CATEGORY_ALLOWED_KEYS) {
    if (data[key] !== undefined) safe[key] = data[key];
  }
  return safe;
};

const createCategory = async (userId, data) => {
  const safeData = pickCategoryFields(data);
  if (safeData.name) {
    safeData.intentId = classifyCategoryIntent(safeData.name) || null;
  }
  const category = new Category({ ...safeData, user: userId });
  return await category.save();
};

const updateCategory = async (userId, id, data) => {
  const safeData = pickCategoryFields(data);

  if (safeData.intentId !== undefined) {
    if (safeData.intentId !== null && !INTENTS.some(i => i.id === safeData.intentId)) {
      const err = new Error("Invalid intentId");
      err.statusCode = 400;
      throw err;
    }
  } else if (safeData.name) {
    safeData.intentId = classifyCategoryIntent(safeData.name) || null;
  }
  
  const category = await Category.findOneAndUpdate({ _id: id, user: userId }, safeData, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};

const deleteCategory = async (userId, id) => {
  const category = await Category.findOne({ _id: id, user: userId });

  if (!category) {
    const err = new Error("Category not found.");
    err.statusCode = 404;
    throw err;
  }

const hasTransactions = await Transaction.exists({
  category: category._id, user: userId,
});

  if (hasTransactions) {
    const err = new Error(
      "Cannot delete category because it has transactions."
    );

    err.statusCode = 409;
    throw err;
  }

  await Category.deleteOne({ _id: id, user: userId });
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
