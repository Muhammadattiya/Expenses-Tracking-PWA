const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const { authLimiter } = require('./rateLimiter');

module.exports = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.replace('Bearer ', '');
  }

  if (!token) return next(new AppError('Authentication required.', 401));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Verify token version to support server-side revocation (logout / password change)
    const user = await User.findById(decoded.id).select('tokenVersion').lean();
    if (!user) return next(new AppError('User no longer exists.', 401));
    if ((decoded.v ?? 0) !== (user.tokenVersion ?? 0)) {
      return next(new AppError('Your session has been revoked. Please sign in again.', 401));
    }

    req.user = decoded;
    return authLimiter(req, res, next);
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError('Your session has expired. Please sign in again.', 401));
  }
};
