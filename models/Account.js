const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountNumber: { type: String, required: true },
  type: { type: String, enum: ['SAVINGS', 'CURRENT'], required: true },
  balance: { type: Number, required: true, min: 0 },
  minimumBalance: { type: Number, required: true, min: 0 },
  dailyTransferLimit: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'REJECTED', 'FROZEN', 'CLOSED'], default: 'PENDING' }
}, { timestamps: true });

accountSchema.index({ accountNumber: 1 }, { unique: true });
accountSchema.index({ userId: 1 });

module.exports = mongoose.model('Account', accountSchema);