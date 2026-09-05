const mongoose = require('mongoose');
const Beneficiary = require('../models/Beneficiary');
const Account = require('../models/Account');

/**
 * Create a new beneficiary
 * POST /api/beneficiaries
 */
const createBeneficiary = async (req, res, next) => {
  try {
    const { accountId, beneficiaryAccountNumber, nickname } = req.body;
    const currentUserId = req.user.userId.toString();

    // 1. Find source account & verify existence
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid source account ID format',
        errorCode: 'INVALID_ID'
      });
    }

    const sourceAccount = await Account.findById(accountId);
    if (!sourceAccount) {
      return res.status(404).json({
        success: false,
        message: 'Source account not found',
        errorCode: 'ACCOUNT_NOT_FOUND'
      });
    }

    // 2. Enforce ownership: accountId must belong to req.user.userId
    if (sourceAccount.userId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage beneficiaries for this account',
        errorCode: 'ACCOUNT_NOT_OWNED'
      });
    }

    // 3. Source account must be ACTIVE
    if (sourceAccount.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Source account is not active (status: ${sourceAccount.status})`,
        errorCode: 'ACCOUNT_NOT_ACTIVE'
      });
    }

    // 4. Beneficiary account number must resolve to an existing account
    const destAccount = await Account.findOne({ accountNumber: beneficiaryAccountNumber.trim() });
    if (!destAccount) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary account number does not exist',
        errorCode: 'BENEFICIARY_ACCOUNT_NOT_FOUND'
      });
    }

    // 5. Reject self-beneficiary (source account number === destination account number)
    if (destAccount._id.toString() === sourceAccount._id.toString() || destAccount.accountNumber === sourceAccount.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add your own account as a beneficiary',
        errorCode: 'SELF_BENEFICIARY'
      });
    }

    // 6. Check for duplicate beneficiary
    const existing = await Beneficiary.findOne({
      accountId: sourceAccount._id,
      beneficiaryAccountNumber: beneficiaryAccountNumber.trim()
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Beneficiary with this account number already exists for this account',
        errorCode: 'DUPLICATE_BENEFICIARY'
      });
    }

    // 7. Create beneficiary
    const beneficiary = await Beneficiary.create({
      accountId: sourceAccount._id,
      beneficiaryAccountNumber: beneficiaryAccountNumber.trim(),
      nickname: nickname.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Beneficiary added successfully',
      data: beneficiary
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Beneficiary with this account number already exists for this account',
        errorCode: 'DUPLICATE_BENEFICIARY'
      });
    }
    next(error);
  }
};

/**
 * Get beneficiaries by account ID
 * GET /api/beneficiaries/account/:accountId
 */
const getBeneficiariesByAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const currentUserId = req.user.userId.toString();

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID format',
        errorCode: 'INVALID_ID'
      });
    }

    const sourceAccount = await Account.findById(accountId);
    if (!sourceAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
        errorCode: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Ownership check
    if (sourceAccount.userId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view beneficiaries for this account',
        errorCode: 'ACCOUNT_NOT_OWNED'
      });
    }

    const beneficiaries = await Beneficiary.find({ accountId: sourceAccount._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: beneficiaries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get beneficiary or beneficiaries by generic ID (supports both Beneficiary ID and Account ID)
 * GET /api/beneficiaries/:id
 */
const getBeneficiaryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        errorCode: 'INVALID_ID'
      });
    }

    // 1. Try finding as Beneficiary first
    const beneficiary = await Beneficiary.findById(id);
    if (beneficiary) {
      const sourceAccount = await Account.findById(beneficiary.accountId);
      if (!sourceAccount || sourceAccount.userId.toString() !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this beneficiary',
          errorCode: 'BENEFICIARY_NOT_OWNED'
        });
      }

      return res.status(200).json({
        success: true,
        data: beneficiary
      });
    }

    // 2. If not found as Beneficiary, check if ID refers to an Account
    const account = await Account.findById(id);
    if (account) {
      if (account.userId.toString() !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view beneficiaries for this account',
          errorCode: 'ACCOUNT_NOT_OWNED'
        });
      }

      const beneficiaries = await Beneficiary.find({ accountId: account._id }).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: beneficiaries
      });
    }

    // 3. Not found as either
    return res.status(404).json({
      success: false,
      message: 'Beneficiary not found',
      errorCode: 'BENEFICIARY_NOT_FOUND'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a beneficiary by ID
 * DELETE /api/beneficiaries/:id
 */
const deleteBeneficiary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid beneficiary ID format',
        errorCode: 'INVALID_ID'
      });
    }

    const beneficiary = await Beneficiary.findById(id);
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found',
        errorCode: 'BENEFICIARY_NOT_FOUND'
      });
    }

    const sourceAccount = await Account.findById(beneficiary.accountId);
    if (!sourceAccount || sourceAccount.userId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this beneficiary',
        errorCode: 'BENEFICIARY_NOT_OWNED'
      });
    }

    await Beneficiary.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Beneficiary deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBeneficiary,
  getBeneficiariesByAccount,
  getBeneficiaryById,
  deleteBeneficiary
};
