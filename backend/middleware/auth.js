const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AppError('Authentication required.', 401));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new AppError('Your session has expired. Please sign in again.', 401));
  }
};
