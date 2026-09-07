const AppError = require('../utils/AppError');

function errorHandler(error, req, res, next) {
  let normalized = error;

  if (error.type === 'entity.parse.failed') {
    normalized = new AppError('Invalid JSON request body', 400, 'INVALID_JSON');
  } else if (error.name === 'CastError') {
    normalized = new AppError('Invalid identifier', 400, 'INVALID_ID');
  } else if (error.name === 'ValidationError') {
    normalized = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  } else if (error.code === 11000) {
    normalized = new AppError('A record with that value already exists', 409, 'DUPLICATE_RESOURCE');
  }

  const statusCode = normalized.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : normalized.message,
    errorCode: normalized.errorCode || 'INTERNAL_SERVER_ERROR'
  };

  if (statusCode === 500) console.error(error);
  res.status(statusCode).json(response);
}

module.exports = errorHandler;