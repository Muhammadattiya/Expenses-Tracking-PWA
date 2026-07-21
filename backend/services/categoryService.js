const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

const getCategories = async () => {
  return await Category.find().sort({ type: 1, name: 1 });
};

const createCategory = async (data) => {
  const category = new Category(data);
  return await category.save();
};

const updateCategory = async (id, data) => {
  const category = await Category.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};

const deleteCategory = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    const err = new Error("Category not found.");
    err.statusCode = 404;
    throw err;
  }

const hasTransactions = await Transaction.exists({
  category: category._id,
});

  if (hasTransactions) {
    const err = new Error(
      "Cannot delete category because it has transactions."
    );

    err.statusCode = 409;
    throw err;
  }

  await Category.findByIdAndDelete(id);
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};