const AppError = require('../utils/AppError');

const roleMiddleware = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
  }
  return next();
};

module.exports = roleMiddleware;