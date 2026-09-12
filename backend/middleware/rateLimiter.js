const rateLimit = require('express-rate-limit');

// Global authenticated rate limiter
// Limits an authenticated user to 300 requests per 15 minutes (~20 req/min).
// This is extremely generous for legitimate traffic (including offline sync drains)
// but strictly prevents malicious `while(true)` script abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  validate: false, // Don't log warnings for valid IP limits
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Import-specific rate limiter
// Transaction imports are heavily optimized but still expensive.
// Limit to 5 imports per 15 minutes to prevent event-loop abuse.
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  validate: false,
  message: { success: false, message: 'Too many imports requested. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  importLimiter
};
