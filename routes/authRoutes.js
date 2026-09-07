const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { registerValidator, loginValidator, kycValidator } = require('../validators/authValidator');
const { idValidator } = require('../validators/accountValidator');
const { register, login, getProfile, updateKyc } = require('../controllers/authController');

const router = express.Router();

router.post('/auth/register', registerValidator, validate, register);
router.post('/auth/login', loginValidator, validate, login);
router.get('/customers/me', authenticate, getProfile);
router.put('/customers/:id/kyc', authenticate, authorize('BANK_STAFF', 'ADMIN'), idValidator, kycValidator, validate, updateKyc);

module.exports = router;