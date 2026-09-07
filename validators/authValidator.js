const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Phone must be a valid 10-digit Indian mobile number'),
  body('pan').matches(/^[A-Z]{5}\d{4}[A-Z]$/i).withMessage('PAN must match the format ABCDE1234F'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('dateOfBirth').isISO8601().withMessage('A valid date of birth is required').toDate()
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const kycValidator = [
  body('kycStatus').isIn(['VERIFIED', 'REJECTED']).withMessage('KYC status must be VERIFIED or REJECTED')
];

module.exports = { registerValidator, loginValidator, kycValidator };