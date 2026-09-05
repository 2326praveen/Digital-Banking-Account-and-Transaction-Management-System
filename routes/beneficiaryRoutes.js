const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const beneficiaryController = require('../controllers/beneficiaryController');
const {
  validateCreateBeneficiary,
  validateAccountIdParam,
  validateBeneficiaryIdParam
} = require('../validators/beneficiaryValidator');

// All beneficiary routes require authenticated CUSTOMER role
router.use(auth);
router.use(role('CUSTOMER'));

// Explicit account beneficiaries listing
router.get(
  '/account/:accountId',
  validateAccountIdParam,
  beneficiaryController.getBeneficiariesByAccount
);

// Create beneficiary
router.post(
  '/',
  validateCreateBeneficiary,
  beneficiaryController.createBeneficiary
);

// Get beneficiary by ID (or list by accountId if passed)
router.get(
  '/:id',
  validateBeneficiaryIdParam,
  beneficiaryController.getBeneficiaryById
);

// Delete beneficiary
router.delete(
  '/:id',
  validateBeneficiaryIdParam,
  beneficiaryController.deleteBeneficiary
);

module.exports = router;
