const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

function authMiddleware(req, res, next) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-only-secret');
    return next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}

module.exports = authMiddleware;