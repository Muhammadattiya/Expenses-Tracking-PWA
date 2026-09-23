const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const { classifyCategoryIntent } = require("./categoryIntentClassifier");
const { INTENTS } = require("./quickAdd/intentTaxonomy");

const getCategories = async (userId) => {
  const categories = await Category.find({ user: userId }).sort({ type: 1, order: 1, createdAt: 1 }).lean();

  // Self-healing: if any category lacks an intentId, attempt deterministic classification
  const updates = [];
  for (const cat of categories) {
    if (!cat.intentId) {
      const resolvedIntent = classifyCategoryIntent(cat.name);
      if (resolvedIntent) {
        cat.intentId = resolvedIntent;
        cat.intentSource = 'automatic';
        cat.intentConfidence = 1.0;
        updates.push({
          updateOne: {
            filter: { _id: cat._id, user: userId },
            update: { $set: { intentId: resolvedIntent, intentSource: 'automatic', intentConfidence: 1.0 } }
          }
        });
      }
    }
  }

  // Persist healed categories in the background asynchronously without blocking the read
  if (updates.length > 0) {
    Category.bulkWrite(updates).catch(err => {
      console.error('[CATEGORY] Failed to persist self-healed category intents:', err.message);
    });
  }

  return categories;
};

// Whitelist allowed fields to prevent mass assignment
const CATEGORY_ALLOWED_KEYS = ['name', 'type', 'icon', 'color', 'intentId', 'order'];
const pickCategoryFields = (data) => {
  const safe = {};
  for (const key of CATEGORY_ALLOWED_KEYS) {
    if (data[key] !== undefined) safe[key] = data[key];
  }
  return safe;
};

const createCategory = async (userId, data) => {
  const safeData = pickCategoryFields(data);
  if (safeData.name && !safeData.intentId) {
    safeData.intentId = classifyCategoryIntent(safeData.name) || null;
  }
  if (safeData.intentId && !safeData.intentSource) {
    safeData.intentSource = 'automatic';
    safeData.intentConfidence = 1.0;
  }
  if (safeData.order === undefined && safeData.type) {
    const lastCategory = await Category.findOne({ user: userId, type: safeData.type }).sort({ order: -1 }).select('order').lean();
    safeData.order = (lastCategory && typeof lastCategory.order === 'number') ? lastCategory.order + 1 : 0;
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

const reorderCategories = async (userId, orderedIds) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return getCategories(userId);
  }

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, user: userId },
      update: { $set: { order: index } }
    }
  }));

  await Category.bulkWrite(bulkOps);
  return getCategories(userId);
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
