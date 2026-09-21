const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require("../controllers/categoryController");

router.get("/", getCategories);

router.post("/", createCategory);

router.put("/reorder", reorderCategories);

router.put("/:id", updateCategory);

router.delete("/:id", deleteCategory);

module.exports = router;
