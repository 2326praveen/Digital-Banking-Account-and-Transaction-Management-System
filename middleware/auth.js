const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required', errorCode: 'AUTH_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', errorCode: 'INVALID_TOKEN' });
  }
}

module.exports = authenticate;