const authService = require('../services/authService');
const User = require('../models/User');

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
