// TODO: replace with Member 1's implementation on merge
const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    const flatRoles = allowedRoles.flat();
    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions for this action',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = role;
