const mongoose = require('mongoose');

const accountStatusHistorySchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  reason: { type: String, required: true, trim: true }
}, { timestamps: true });

accountStatusHistorySchema.index({ accountId: 1, createdAt: 1 });

module.exports = mongoose.models.AccountStatusHistory ||
  mongoose.model('AccountStatusHistory', accountStatusHistorySchema);