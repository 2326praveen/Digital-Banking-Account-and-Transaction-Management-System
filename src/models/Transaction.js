const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
  transferId: { type: mongoose.Schema.Types.ObjectId, index: true },
  type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  amount: { type: Number, required: true, min: 0 },
  flagged: { type: Boolean, default: false, index: true },
  description: String
}, { timestamps: true });

transactionSchema.index({ accountId: 1, createdAt: 1 });
transactionSchema.index({ flagged: 1, createdAt: 1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);