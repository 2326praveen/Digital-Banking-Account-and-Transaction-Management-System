const mongoose = require('mongoose');
const Account = require('../models/Account');
const Approval = require('../models/Approval');
const User = require('../models/User');
const generateAccountNumber = require('../utils/accountNumber');

const defaults = { SAVINGS: { minimumBalance: 5000, dailyTransferLimit: 25000 }, CURRENT: { minimumBalance: 10000, dailyTransferLimit: 100000 } };

async function uniqueAccountNumber() {
  let accountNumber;
  do { accountNumber = generateAccountNumber(); } while (await Account.exists({ accountNumber }));
  return accountNumber;
}

async function createAccount(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    if (user.kycStatus !== 'VERIFIED') return res.status(400).json({ success: false, message: 'KYC verification is required before opening an account', errorCode: 'KYC_NOT_VERIFIED' });
    const configuration = defaults[req.body.type];
    if (req.body.initialDeposit < configuration.minimumBalance) return res.status(400).json({ success: false, message: 'Initial deposit must satisfy the minimum balance requirement', errorCode: 'MINIMUM_BALANCE_REQUIRED' });
    const account = await Account.create({ userId: user._id, accountNumber: await uniqueAccountNumber(), type: req.body.type, balance: req.body.initialDeposit, ...configuration, status: 'PENDING' });
    return res.status(201).json({ success: true, message: 'Account application created successfully', data: account });
  } catch (error) { return next(error); }
}

async function listAccounts(req, res, next) {
  try { return res.json({ success: true, message: 'Accounts retrieved successfully', data: await Account.find({ userId: req.user.userId }) }); } catch (error) { return next(error); }
}

async function getAccount(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found', errorCode: 'ACCOUNT_NOT_FOUND' });
    if (req.user.role === 'CUSTOMER' && account.userId.toString() !== req.user.userId) return res.status(403).json({ success: false, message: 'You do not have permission to view this account', errorCode: 'FORBIDDEN' });
    return res.json({ success: true, message: 'Account retrieved successfully', data: account });
  } catch (error) { return next(error); }
}

async function pendingAccounts(req, res, next) {
  try { return res.json({ success: true, message: 'Pending accounts retrieved successfully', data: await Account.find({ status: 'PENDING' }) }); } catch (error) { return next(error); }
}

async function approveAccount(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found', errorCode: 'ACCOUNT_NOT_FOUND' });
    if (account.status !== 'PENDING') return res.status(409).json({ success: false, message: 'Only pending accounts can be approved or rejected', errorCode: 'INVALID_STATUS_TRANSITION' });
    const decision = req.body.status;
    account.status = decision === 'APPROVED' ? 'ACTIVE' : 'REJECTED';
    await account.save();
    await Approval.create({ accountId: account._id, staffId: req.user.userId, decision, remarks: req.body.remarks || '' });
    return res.json({ success: true, message: `Account ${decision.toLowerCase()} successfully`, data: account });
  } catch (error) { return next(error); }
}

async function approvalHistory(req, res, next) {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found', errorCode: 'ACCOUNT_NOT_FOUND' });
    if (req.user.role === 'CUSTOMER' && account.userId.toString() !== req.user.userId) return res.status(403).json({ success: false, message: 'You do not have permission to view this account', errorCode: 'FORBIDDEN' });
    return res.json({ success: true, message: 'Approval history retrieved successfully', data: await Approval.find({ accountId: account._id }).sort({ createdAt: -1 }) });
  } catch (error) { return next(error); }
}

module.exports = { createAccount, listAccounts, getAccount, pendingAccounts, approveAccount, approvalHistory };