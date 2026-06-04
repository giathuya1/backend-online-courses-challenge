/**
 * Global Error Handler Middleware
 * Catch all errors and return standardized response
 */

const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[${req.method}] ${req.path}`, {
    error: err.message,
    stack: err.stack,
    body: req.body
  });

  // Validation errors
  if (err.name === 'SequelizeValidationError') {
    const violations = err.errors.map(e => ({
      field: e.path,
      rule: e.validatorKey,
      message: e.message
    }));
    return res.status(400).json(ApiResponse.validationError(violations));
  }

  // Unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const violations = err.errors.map(e => ({
      field: e.path,
      rule: 'unique',
      message: `${e.path} already exists`
    }));
    return res.status(400).json(ApiResponse.validationError(violations));
  }

  // Foreign key errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(
      ApiResponse.error('Invalid reference: related record not found')
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(ApiResponse.error('Invalid token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(ApiResponse.error('Token expired'));
  }

  // Default 500 error
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev ? err.message : 'Internal server error';

  res.status(err.statusCode || 500).json(
    ApiResponse.error(message)
  );
};

module.exports = errorHandler;
