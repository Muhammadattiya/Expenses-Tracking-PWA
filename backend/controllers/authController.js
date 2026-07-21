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
