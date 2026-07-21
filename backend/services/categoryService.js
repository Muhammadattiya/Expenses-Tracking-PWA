const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

const getCategories = async (userId) => {
  return Category.find({ user: userId }).sort({ type: 1, name: 1 });
};

const createCategory = async (userId, data) => {
  const category = new Category({ ...data, user: userId });
  return await category.save();
};

const updateCategory = async (userId, id, data) => {
  const category = await Category.findOneAndUpdate({ _id: id, user: userId }, data, {
    new: true,
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
