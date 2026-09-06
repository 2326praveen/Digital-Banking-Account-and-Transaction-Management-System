class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

module.exports = AppError;