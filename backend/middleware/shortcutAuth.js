const User = require('../models/User');
const crypto = require('crypto');

const TOKEN_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

module.exports = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    token = token.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Fix #8: Select minimal fields only — no need for full user document
    const user = await User.findOne({ shortcutTokenHash: hashedToken })
      .select('_id email shortcutTokenCreatedAt')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or revoked shortcut token' });
    }

    // Fix #6: Check token expiry (1 year)
    if (user.shortcutTokenCreatedAt) {
      const age = Date.now() - new Date(user.shortcutTokenCreatedAt).getTime();
      if (age > TOKEN_EXPIRY_MS) {
        return res.status(401).json({ 
          message: 'Token expired. Please generate a new token from the Finova app settings.' 
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[ERROR] shortcutAuth Middleware:', error);
    res.status(500).json({ message: 'Internal Server Error during shortcut authentication' });
  }
};
