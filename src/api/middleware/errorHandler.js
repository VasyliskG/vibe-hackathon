const logger = require('../../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Error occurred', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Validation errors (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  // Not found errors
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }

  // Domain errors (business logic)
  if (err.message && err.message.includes('must be')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};