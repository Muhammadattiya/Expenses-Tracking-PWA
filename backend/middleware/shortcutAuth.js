const User = require('../models/User');
const crypto = require('crypto');

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

    const user = await User.findOne({ shortcutTokenHash: hashedToken }).select('-__v');

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or revoked shortcut token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[ERROR] shortcutAuth Middleware:', error);
    res.status(500).json({ message: 'Internal Server Error during shortcut authentication' });
  }
};
