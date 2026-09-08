const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { registerValidator, loginValidator, kycValidator } = require('../validators/authValidator');
const { idValidator } = require('../validators/accountValidator');
const { register, login, getProfile, updateKyc } = require('../controllers/authController');

const router = express.Router();

const allowStaffOrSelf = (req, res, next) => {
  if (req.user.role === 'BANK_STAFF' || req.user.role === 'ADMIN' || req.user.userId === req.params.id) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'You do not have permission to perform this action', errorCode: 'FORBIDDEN' });
};

router.post('/auth/register', registerValidator, validate, register);
router.post('/auth/login', loginValidator, validate, login);
router.get('/customers/me', authenticate, getProfile);
router.put('/customers/:id/kyc', authenticate, allowStaffOrSelf, idValidator, kycValidator, validate, updateKyc);

module.exports = router;