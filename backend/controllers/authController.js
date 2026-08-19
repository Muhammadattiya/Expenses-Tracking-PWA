const authService = require('../services/authService');
const User = require('../models/User');
const crypto = require('crypto');

exports.googleSignIn = async (req, res, next) => {
  try { res.json(await authService.googleSignIn(req.body.credential)); } catch (error) { next(error); }
};
exports.me = async (req, res, next) => {
  try { res.json(await User.findById(req.user.id).select('-__v')); } catch (error) { next(error); }
};
exports.updateProfile = async (req, res, next) => {
  try { res.json(await authService.updateProfile(req.user.id, req.body)); } catch (error) { next(error); }
};
exports.deleteAllData = async (req, res, next) => {
  try { await authService.deleteAllUserData(req.user.id); res.status(204).end(); } catch (error) { next(error); }
};
exports.updatePreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Only allow known preference keys
    const ALLOWED_PREF_KEYS = ['budgetPeriod', 'budgetStartDayWeekly', 'budgetStartDayMonthly'];
    const safePrefs = {};
    for (const key of ALLOWED_PREF_KEYS) {
      if (req.body[key] !== undefined) safePrefs[key] = req.body[key];
    }
    user.preferences = { ...user.preferences, ...safePrefs };
    await user.save();
    res.json(user);
  } catch (error) { next(error); }
};
