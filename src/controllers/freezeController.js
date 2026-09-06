const mongoose = require('mongoose');
const freezeService = require('../services/freezeService');
const AppError = require('../utils/AppError');

function validateAccountId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid account ID', 400, 'INVALID_ACCOUNT_ID');
  }
}

async function freeze(req, res) {
  validateAccountId(req.params.id);
  const changedBy = req.user.userId || req.user.id || req.user.sub;
  const account = await freezeService.freezeAccount(req.params.id, changedBy, req.body?.reason);
  res.json({ success: true, message: 'Account frozen successfully', data: { account } });
}

async function unfreeze(req, res) {
  validateAccountId(req.params.id);
  const changedBy = req.user.userId || req.user.id || req.user.sub;
  const account = await freezeService.unfreezeAccount(req.params.id, changedBy, req.body?.reason);
  res.json({ success: true, message: 'Account unfrozen successfully', data: { account } });
}

async function statusHistory(req, res) {
  validateAccountId(req.params.id);
  const history = await freezeService.getStatusHistory(req.params.id);
  res.json({ success: true, data: history });
}

module.exports = { freeze, unfreeze, statusHistory };