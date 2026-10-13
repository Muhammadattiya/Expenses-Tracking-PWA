const UserMerchantKnowledge = require('../models/UserMerchantKnowledge');
const Category = require('../models/Category');

exports.getLearnedMerchants = async (req, res, next) => {
  try {
    const rules = await UserMerchantKnowledge.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach category details corresponding to intentId
    const categories = await Category.find({ user: req.user.id }).lean();
    const enriched = rules.map(rule => {
      const matchedCategory = categories.find(c => c.intentId === rule.intentId);
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
    const { intentId } = req.body;
    if (!intentId || typeof intentId !== 'string') {
      return res.status(400).json({ message: 'Valid intentId is required' });
    }
    const rule = await UserMerchantKnowledge.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { intentId: intentId.trim() },
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
