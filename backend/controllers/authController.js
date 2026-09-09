const authService = require('../services/authService');
const User = require('../models/User');
const crypto = require('crypto');

const attachCookie = (res, token) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

exports.googleSignIn = async (req, res, next) => {
  try { 
    const result = await authService.googleSignIn(req.body.credential); 
    attachCookie(res, result.token);
    const { token, ...safeResult } = result;
    res.json(safeResult); 
  } catch (error) { next(error); }
};
exports.register = async (req, res, next) => {
  try { 
    const result = await authService.register(req.body); 
    attachCookie(res, result.token);
    const { token, ...safeResult } = result;
    res.status(201).json(safeResult); 
  } catch (error) { next(error); }
};
exports.login = async (req, res, next) => {
  try { 
    const result = await authService.login(req.body); 
    attachCookie(res, result.token);
    const { token, ...safeResult } = result;
    res.json(safeResult); 
  } catch (error) { next(error); }
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
    const ALLOWED_PREF_KEYS = ['trackingPeriod', 'trackingStartDayWeekly', 'trackingStartDayMonthly'];
    const safePrefs = {};
    for (const key of ALLOWED_PREF_KEYS) {
      if (req.body[key] !== undefined) safePrefs[key] = req.body[key];
    }
    user.preferences = { ...user.preferences, ...safePrefs };
    await user.save();
    res.json(user);
  } catch (error) { next(error); }
};

exports.completeOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.hasCompletedOnboarding = true;
    await user.save();
    res.json(user);
  } catch (error) { next(error); }
};

exports.resetOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.hasCompletedOnboarding = false;
    await user.save();
    res.json(user);
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    await authService.invalidateAllSessions(req.user.id);
    res.cookie('jwt', 'loggedout', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      expires: new Date(Date.now() + 10 * 1000)
    });
    res.json({ success: true, message: 'Logged out successfully. All sessions have been invalidated.' });
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    attachCookie(res, result.token);
    const { token, ...safeResult } = result;
    res.json(safeResult);
  } catch (error) { next(error); }
};
