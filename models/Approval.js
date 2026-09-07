const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
  remarks: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

approvalSchema.index({ accountId: 1 });

module.exports = mongoose.model('Approval', approvalSchema);