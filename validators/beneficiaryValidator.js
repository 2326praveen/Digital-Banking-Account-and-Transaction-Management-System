const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg,
      errorCode: firstError.msg.includes('ID') ? 'INVALID_ID' : 'INVALID_INPUT'
    });
  }
  next();
};

const validateCreateBeneficiary = [
  body('accountId')
    .notEmpty()
    .withMessage('Source account ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Source account ID is not a valid ObjectId'),
  body('beneficiaryAccountNumber')
    .notEmpty()
    .withMessage('Beneficiary account number is required')
    .isString()
    .trim()
    .withMessage('Beneficiary account number must be a string'),
  body('nickname')
    .notEmpty()
    .withMessage('Nickname is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nickname must be between 2 and 50 characters'),
  handleValidationErrors
];

const validateAccountIdParam = [
  param('accountId')
    .notEmpty()
    .withMessage('Account ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid account ID format'),
  handleValidationErrors
];

const validateBeneficiaryIdParam = [
  param('id')
    .notEmpty()
    .withMessage('Beneficiary ID is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid beneficiary ID format'),
  handleValidationErrors
];

module.exports = {
  validateCreateBeneficiary,
  validateAccountIdParam,
  validateBeneficiaryIdParam,
  handleValidationErrors
};
