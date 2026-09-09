const categoryService = require("../services/categoryService");

const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getCategories(req.user.id);

    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.user.id, req.body);

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.user.id, req.params.id,
      req.body
    );

    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.user.id, req.params.id);

    res.status(200).json({
      message: "Category deleted successfully.",
    });
  } catch (error) {
    const status = error.statusCode || 400;

    res.status(status).json({
      message: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
