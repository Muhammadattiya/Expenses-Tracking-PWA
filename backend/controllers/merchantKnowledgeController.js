const UserMerchantKnowledge = require('../models/UserMerchantKnowledge');
const Category = require('../models/Category');

exports.getLearnedMerchants = async (req, res, next) => {
  try {
    const rules = await UserMerchantKnowledge.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach category details corresponding to category or intentId
    const categories = await Category.find({ user: req.user.id }).lean();
    const enriched = rules.map(rule => {
      let matchedCategory = null;
      if (rule.category) {
        matchedCategory = categories.find(c => c._id.toString() === rule.category.toString());
      }
      if (!matchedCategory && rule.intentId) {
        matchedCategory = categories.find(c => c.intentId === rule.intentId);
      }
      return {
        ...rule,
        category: matchedCategory ? {
          _id: matchedCategory._id,
          name: matchedCategory.name,
          color: matchedCategory.color,
          icon: matchedCategory.icon
        } : null
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.updateLearnedMerchant = async (req, res, next) => {
  try {
    const { intentId, categoryId } = req.body;
    let updateFields = {};

    if (categoryId) {
      const categoryDoc = await Category.findOne({ _id: categoryId, user: req.user.id });
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
      updateFields.category = categoryDoc._id;
      updateFields.intentId = categoryDoc.intentId || intentId || 'other';
    } else if (intentId) {
      // Check if intentId is an ObjectId string referencing a category
      const categoryDoc = await Category.findOne({ _id: intentId, user: req.user.id });
      if (categoryDoc) {
        updateFields.category = categoryDoc._id;
        updateFields.intentId = categoryDoc.intentId || 'other';
      } else {
        updateFields.intentId = String(intentId).trim();
        const matchedCat = await Category.findOne({ intentId: updateFields.intentId, user: req.user.id });
        if (matchedCat) {
          updateFields.category = matchedCat._id;
        }
      }
    } else {
      return res.status(400).json({ message: 'Valid categoryId or intentId is required' });
    }

    const rule = await UserMerchantKnowledge.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateFields,
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.status(200).json(rule);
  } catch (error) {
    next(error);
  }
};

exports.deleteLearnedMerchant = async (req, res, next) => {
  try {
    const rule = await UserMerchantKnowledge.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.status(200).json({ message: 'Rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};
