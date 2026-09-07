const IncomeProfile = require('../models/IncomeProfile');

const getProfiles = async (req, res) => {
  try {
    const profiles = await IncomeProfile.find({ user: req.user.id })
      .populate('account', 'name _id')
      .populate('category', 'name _id type icon color');
    res.status(200).json(profiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

const createProfile = async (req, res) => {
  try {
    const safeData = pickProfileFields(req.body);
    const profile = new IncomeProfile({
      ...safeData,
      user: req.user.id
    });
    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const safeData = pickProfileFields(req.body);
    const profile = await IncomeProfile.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      safeData,
      { returnDocument: 'after', runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const profile = await IncomeProfile.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json({ message: 'Profile deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile
};
