// TODO: replace with Member 1's implementation on merge
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_banking_app_change_in_production';
    
    const decoded = jwt.verify(token, secret);
    req.user = {
      userId: decoded.userId || decoded.id || decoded._id,
      role: decoded.role || 'CUSTOMER'
    };

    if (!req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
        errorCode: 'INVALID_TOKEN'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      errorCode: 'INVALID_TOKEN'
    });
  }
};

module.exports = auth;
