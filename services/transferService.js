const mongoose = require('mongoose');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const {
  AppError,
  toMinorUnits,
  toMajorUnits,
  generateTransferId,
  recordOutgoingTransfer,
  getDailyOutgoingTotal
} = require('../utils/transactionHelpers');

/**
 * Executes a fund transfer between accounts with atomic balance updates and strict validation.
 * 
 * @param {Object} params
 * @param {string} params.fromAccountId Source account ID
 * @param {string} params.beneficiaryId Beneficiary ID
 * @param {number|string} params.amount Transfer amount in rupees
 * @param {Object} params.currentUser Authenticated user { userId, role }
 * @returns {Promise<Object>} Transfer result data
 */
const executeTransfer = async ({ fromAccountId, beneficiaryId, amount, currentUser }) => {
  // Step 1: Validate input IDs format
  if (!mongoose.Types.ObjectId.isValid(fromAccountId)) {
    throw new AppError('Invalid source account ID format', 400, 'INVALID_ID');
  }
  if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
    throw new AppError('Invalid beneficiary ID format', 400, 'INVALID_ID');
  }

  // Step 2: Find source account; verify it exists (404 ACCOUNT_NOT_FOUND)
  const sourceAccount = await Account.findById(fromAccountId);
  if (!sourceAccount) {
    throw new AppError('Source account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  // Step 3: Verify sourceAccount.userId.toString() === currentUser.userId (403 ACCOUNT_NOT_OWNED)
  if (sourceAccount.userId.toString() !== currentUser.userId.toString()) {
    throw new AppError('You do not own this source account', 403, 'ACCOUNT_NOT_OWNED');
  }

  // Step 4: Verify source account status is ACTIVE (409 ACCOUNT_NOT_ACTIVE)
  if (sourceAccount.status !== 'ACTIVE') {
    throw new AppError(`Source account is not active (status: ${sourceAccount.status})`, 409, 'ACCOUNT_NOT_ACTIVE');
  }

  // Step 5: Find beneficiary by beneficiaryId (404 BENEFICIARY_NOT_FOUND)
  const beneficiary = await Beneficiary.findById(beneficiaryId);
  if (!beneficiary) {
    throw new AppError('Beneficiary not found', 404, 'BENEFICIARY_NOT_FOUND');
  }

  // Step 6: Verify beneficiary.accountId === sourceAccount._id (403 BENEFICIARY_NOT_OWNED)
  if (beneficiary.accountId.toString() !== sourceAccount._id.toString()) {
    throw new AppError('Beneficiary does not belong to the specified source account', 403, 'BENEFICIARY_NOT_OWNED');
  }

  // Step 7: Resolve destination account from beneficiary.beneficiaryAccountNumber (404 ACCOUNT_NOT_FOUND)
  const destAccount = await Account.findOne({ accountNumber: beneficiary.beneficiaryAccountNumber });
  if (!destAccount) {
    throw new AppError('Destination account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  // Step 8: Verify destination account is ACTIVE (409 ACCOUNT_NOT_ACTIVE)
  if (destAccount.status !== 'ACTIVE') {
    throw new AppError(`Destination account is not active (status: ${destAccount.status})`, 409, 'ACCOUNT_NOT_ACTIVE');
  }

  // Step 9: Reject if fromAccountId === destinationAccountId (400 SELF_TRANSFER)
  if (sourceAccount._id.toString() === destAccount._id.toString() || sourceAccount.accountNumber === destAccount.accountNumber) {
    throw new AppError('Self-transfer is not allowed', 400, 'SELF_TRANSFER');
  }

  // Step 10: Validate amount: present, numeric, > 0, rounded to 2 decimals (400 INVALID_AMOUNT)
  // Convert to integer minor units (paise) here once, downstream uses this integer exclusively
  const transferAmountMinor = toMinorUnits(amount);
  const sourceBalanceMinor = toMinorUnits(sourceAccount.balance);
  const minimumBalanceMinor = toMinorUnits(sourceAccount.minimumBalance);
  const dailyTransferLimitMinor = toMinorUnits(sourceAccount.dailyTransferLimit);

  // Step 11: Check sufficient balance (409 INSUFFICIENT_BALANCE)
  if (sourceBalanceMinor < transferAmountMinor) {
    throw new AppError('Insufficient balance for this transfer', 409, 'INSUFFICIENT_BALANCE');
  }

  // Step 12: Check balance - amount >= account.minimumBalance (409 MINIMUM_BALANCE_VIOLATION)
  if (sourceBalanceMinor - transferAmountMinor < minimumBalanceMinor) {
    throw new AppError(
      `Transfer violates minimum balance requirement of ₹${sourceAccount.minimumBalance}`,
      409,
      'MINIMUM_BALANCE_VIOLATION'
    );
  }

  // Step 13: Check daily limit: sum of today's successful outgoing transfers + new amount <= dailyTransferLimit (409 DAILY_LIMIT_EXCEEDED)
  const todayOutgoingMinor = await getDailyOutgoingTotal(sourceAccount._id);
  if (todayOutgoingMinor + transferAmountMinor > dailyTransferLimitMinor) {
    throw new AppError(
      `Transfer exceeds daily transfer limit of ₹${sourceAccount.dailyTransferLimit}`,
      409,
      'DAILY_LIMIT_EXCEEDED'
    );
  }

  // Step 14: Execute the balance update atomically
  let transferId;
  let remainingBalanceMajor;

  const session = await mongoose.startSession();
  try {
    let supportsTransactions = true;
    try {
      session.startTransaction();
    } catch (txErr) {
      supportsTransactions = false;
    }

    if (supportsTransactions) {
      // Transaction-based execution
      transferId = await generateTransferId(new Date(), session);

      // Perform atomic conditional update on source account within transaction
      // Re-verifying minimum balance constraint inside the database filter prevents race conditions
      const transferAmountMajor = toMajorUnits(transferAmountMinor);
      const minBalanceMajor = toMajorUnits(minimumBalanceMinor);

      const updatedSource = await Account.findOneAndUpdate(
        {
          _id: sourceAccount._id,
          status: 'ACTIVE',
          $expr: {
            $gte: [
              { $round: [{ $subtract: ['$balance', transferAmountMajor] }, 2] },
              minBalanceMajor
            ]
          }
        },
        {
          $inc: { balance: -transferAmountMajor }
        },
        { session, new: true }
      );

      if (!updatedSource) {
        throw new AppError('Transfer failed: Concurrency conflict or balance constraint violated', 409, 'MINIMUM_BALANCE_VIOLATION');
      }

      const updatedDest = await Account.findOneAndUpdate(
        { _id: destAccount._id, status: 'ACTIVE' },
        { $inc: { balance: transferAmountMajor } },
        { session, new: true }
      );

      if (!updatedDest) {
        throw new AppError('Transfer failed: Destination account is unavailable or inactive', 409, 'ACCOUNT_NOT_ACTIVE');
      }

      await session.commitTransaction();
      remainingBalanceMajor = updatedSource.balance;
    } else {
      // Standalone MongoDB fallback without replica set
      transferId = await generateTransferId();
      const transferAmountMajor = toMajorUnits(transferAmountMinor);
      const minBalanceMajor = toMajorUnits(minimumBalanceMinor);

      const updatedSource = await Account.findOneAndUpdate(
        {
          _id: sourceAccount._id,
          status: 'ACTIVE',
          $expr: {
            $gte: [
              { $round: [{ $subtract: ['$balance', transferAmountMajor] }, 2] },
              minBalanceMajor
            ]
          }
        },
        {
          $inc: { balance: -transferAmountMajor }
        },
        { new: true }
      );

      if (!updatedSource) {
        throw new AppError('Transfer failed: Concurrency conflict or balance constraint violated', 409, 'MINIMUM_BALANCE_VIOLATION');
      }

      const updatedDest = await Account.findOneAndUpdate(
        { _id: destAccount._id, status: 'ACTIVE' },
        { $inc: { balance: transferAmountMajor } },
        { new: true }
      );

      if (!updatedDest) {
        // Compensate source balance on failure
        await Account.findByIdAndUpdate(sourceAccount._id, { $inc: { balance: transferAmountMajor } });
        throw new AppError('Transfer failed: Destination account is unavailable or inactive', 409, 'ACCOUNT_NOT_ACTIVE');
      }

      remainingBalanceMajor = updatedSource.balance;
    }
  } catch (error) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Ignore abort errors
      }
    }

    // Translate MongoDB transaction write conflicts to 409 MINIMUM_BALANCE_VIOLATION
    if (
      error.code === 112 ||
      (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) ||
      (error.message && error.message.includes('WriteConflict'))
    ) {
      throw new AppError('Transfer failed: Concurrency conflict or balance constraint violated', 409, 'MINIMUM_BALANCE_VIOLATION');
    }

    throw error;
  } finally {
    await session.endSession();
  }

  // Record outgoing transfer for daily limit tracking
  recordOutgoingTransfer({
    accountId: sourceAccount._id,
    amountMinor: transferAmountMinor,
    date: new Date(),
    transferId
  });

  // Step 15: Return success response data
  return {
    transferId,
    fromAccount: sourceAccount.accountNumber,
    toAccount: destAccount.accountNumber,
    amount: toMajorUnits(transferAmountMinor),
    remainingBalance: Number(remainingBalanceMajor.toFixed(2))
  };
};

module.exports = {
  executeTransfer
};
