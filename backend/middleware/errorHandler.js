const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = statusCode >= 400 && statusCode < 500;

  // Always log the full error server-side
  if (!isOperational) {
    console.error('[ERROR] Unhandled:', err.message);
    console.error('[ERROR] Stack:', err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational
      ? err.message
      : 'An internal error occurred. Please try again later.',
  });
};

module.exports = errorHandler;