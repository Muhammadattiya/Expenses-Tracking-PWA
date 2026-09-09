const IncomeProfile = require('../models/IncomeProfile');
const Account = require('../models/Account');
const Category = require('../models/Category');

const getProfiles = async (req, res, next) => {
  try {
    const profiles = await IncomeProfile.find({ user: req.user.id })
      .populate('account', 'name _id')
      .populate('category', 'name _id type icon color');
    res.status(200).json(profiles);
  } catch (error) {
    next(error);
  }
};

// Whitelist allowed fields to prevent mass assignment
const PROFILE_ALLOWED_KEYS = ['name', 'amount', 'frequency', 'weekDay', 'monthDay', 'account', 'category', 'isActive'];
const pickProfileFields = (data) => {
  const safe = {};
  for (const key of PROFILE_ALLOWED_KEYS) {
    if (data[key] !== undefined) safe[key] = data[key];
  }
  return safe;
};

const createProfile = async (req, res, next) => {
  try {
    const safeData = pickProfileFields(req.body);

    // SEC-005: Validate Category Ownership
    if (safeData.category) {
      const categoryDoc = await Category.findOne({ _id: safeData.category, user: req.user.id });
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    // SEC-005: Validate Account Ownership
    if (safeData.account) {
      const accountDoc = await Account.findOne({ _id: safeData.account, user: req.user.id });
      if (!accountDoc) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }

    const profile = new IncomeProfile({
      ...safeData,
      user: req.user.id
    });
    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const safeData = pickProfileFields(req.body);

    // SEC-005: Validate Category Ownership
    if (safeData.category) {
      const categoryDoc = await Category.findOne({ _id: safeData.category, user: req.user.id });
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    // SEC-005: Validate Account Ownership
    if (safeData.account) {
      const accountDoc = await Account.findOne({ _id: safeData.account, user: req.user.id });
      if (!accountDoc) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }

    const profile = await IncomeProfile.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      safeData,
      { returnDocument: 'after', runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

const deleteProfile = async (req, res, next) => {
  try {
    const profile = await IncomeProfile.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json({ message: 'Profile deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile
};
