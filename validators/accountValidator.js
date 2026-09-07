const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const objectId = (value) => mongoose.Types.ObjectId.isValid(value);

const accountValidator = [
  body('type').isIn(['SAVINGS', 'CURRENT']).withMessage('Account type must be SAVINGS or CURRENT'),
  body('initialDeposit').isFloat({ min: 0 }).withMessage('Initial deposit must be a non-negative number')
];

const approvalValidator = [
  param('id').custom(objectId).withMessage('Invalid account ID'),
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
  body('remarks').optional().isString().trim().isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters')
];

const idValidator = [param('id').custom(objectId).withMessage('Invalid account ID')];

module.exports = { accountValidator, approvalValidator, idValidator };