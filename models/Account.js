// TODO: replace with Member 1's implementation on merge
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['SAVINGS', 'CHECKING', 'SALARY', 'CURRENT'],
      default: 'SAVINGS'
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Balance cannot be negative']
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'FROZEN', 'REJECTED', 'CLOSED'],
      default: 'ACTIVE',
      index: true
    },
    minimumBalance: {
      type: Number,
      required: true,
      default: 1000,
      min: [0, 'Minimum balance cannot be negative']
    },
    dailyTransferLimit: {
      type: Number,
      required: true,
      default: 50000,
      min: [0, 'Daily transfer limit cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
