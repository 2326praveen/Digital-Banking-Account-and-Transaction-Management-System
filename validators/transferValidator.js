const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const handleTransferValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    let errorCode = 'INVALID_INPUT';
    if (firstError.path === 'amount') {
      errorCode = 'INVALID_AMOUNT';
    } else if (firstError.path === 'fromAccountId' || firstError.path === 'beneficiaryId') {
      errorCode = 'INVALID_ID';
    }

    return res.status(400).json({
      success: false,
      message: firstError.msg,
      errorCode
    });
  }
  next();
};

const validateTransfer = [
  body('fromAccountId')
    .notEmpty()
    .withMessage('Source account ID (fromAccountId) is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('fromAccountId must be a valid ObjectId'),
  body('beneficiaryId')
    .notEmpty()
    .withMessage('Beneficiary ID (beneficiaryId) is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('beneficiaryId must be a valid ObjectId'),
  body('amount')
    .notEmpty()
    .withMessage('Transfer amount is required')
    .isNumeric()
    .withMessage('Transfer amount must be a numeric value')
    .custom((val) => {
      const num = Number(val);
      if (num <= 0) {
        throw new Error('Transfer amount must be greater than 0');
      }
      const str = val.toString();
      if (str.includes('.')) {
        const decimals = str.split('.')[1];
        if (decimals.length > 2) {
          throw new Error('Transfer amount cannot exceed 2 decimal places');
        }
      }
      return true;
    }),
  handleTransferValidationErrors
];

module.exports = {
  validateTransfer
};
