function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(409).json({
      success: false,
      message: field === 'email' ? 'Email is already registered' : 'A record with this value already exists',
      errorCode: field === 'email' ? 'DUPLICATE_EMAIL' : 'DUPLICATE_VALUE'
    });
  }
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : 'An unexpected error occurred',
    errorCode: error.errorCode || 'INTERNAL_ERROR'
  });
}

module.exports = errorHandler;