const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['CUSTOMER', 'BANK_STAFF', 'ADMIN'], default: 'CUSTOMER' },
  kycStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  kyc: {
    phone: { type: String, required: true },
    pan: { type: String, required: true, uppercase: true },
    address: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true }
  }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);