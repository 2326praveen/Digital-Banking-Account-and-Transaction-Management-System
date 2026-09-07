const Account = require('../models/Account');
const AccountStatusHistory = require('../models/AccountStatusHistory');
const AppError = require('../utils/AppError');

function validateReason(reason) {
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    throw new AppError('Freeze reason must be between 5 and 500 characters', 400, 'INVALID_FREEZE_REASON');
  }
  return reason.trim();
}

async function changeStatus(accountId, changedBy, targetStatus, reason) {
  const account = await Account.findById(accountId);
  if (!account) throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');

  const expectedStatus = targetStatus === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
  if (account.status !== expectedStatus) {
    if (targetStatus === 'FROZEN' && account.status === 'FROZEN') {
      throw new AppError('Account is already frozen', 409, 'ACCOUNT_ALREADY_FROZEN');
    }
    if (targetStatus === 'ACTIVE' && account.status === 'ACTIVE') {
      throw new AppError('Account is not frozen', 409, 'ACCOUNT_NOT_FROZEN');
    }
    throw new AppError(`Account cannot be ${targetStatus.toLowerCase()}`, 409,
      targetStatus === 'FROZEN' ? 'ACCOUNT_CANNOT_BE_FROZEN' : 'ACCOUNT_CANNOT_BE_UNFROZEN');
  }

  const update = await Account.findOneAndUpdate(
    { _id: accountId, status: expectedStatus },
    { $set: { status: targetStatus } },
    { new: true, runValidators: true }
  );
  if (!update) throw new AppError('Account status changed by another request', 409, 'ACCOUNT_STATUS_CONFLICT');

  await AccountStatusHistory.create({
    accountId,
    changedBy,
    previousStatus: expectedStatus,
    newStatus: targetStatus,
    reason
  });
  return update;
}

async function freezeAccount(accountId, changedBy, reason) {
  return changeStatus(accountId, changedBy, 'FROZEN', validateReason(reason));
}

async function unfreezeAccount(accountId, changedBy, reason) {
  const auditReason = reason === undefined ? 'Account unfrozen by authorized staff' : validateReason(reason);
  return changeStatus(accountId, changedBy, 'ACTIVE', auditReason);
}

async function getStatusHistory(accountId) {
  return AccountStatusHistory.find({ accountId })
    .sort({ createdAt: -1 })
    .populate('changedBy', 'email role')
    .lean();
}

module.exports = { freezeAccount, unfreezeAccount, getStatusHistory };