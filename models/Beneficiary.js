const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Source account ID is required'],
      index: true
    },
    beneficiaryAccountNumber: {
      type: String,
      required: [true, 'Beneficiary account number is required'],
      trim: true
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true,
      minlength: [2, 'Nickname must be at least 2 characters long'],
      maxlength: [50, 'Nickname cannot exceed 50 characters']
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate beneficiary per source account
beneficiarySchema.index({ accountId: 1, beneficiaryAccountNumber: 1 }, { unique: true });

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;
