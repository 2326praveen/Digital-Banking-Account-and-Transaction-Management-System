const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: { type: String, unique: true, sparse: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  balance: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REJECTED', 'FROZEN', 'CLOSED'],
    default: 'PENDING',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Account || mongoose.model('Account', accountSchema);