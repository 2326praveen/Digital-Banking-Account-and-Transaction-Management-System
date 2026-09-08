const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  password: { type: String, select: false },
  role: { type: String, enum: ['CUSTOMER', 'BANK_STAFF', 'ADMIN'], default: 'CUSTOMER' },
  kycStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  kyc: {
    phone: { type: String },
    pan: { type: String, uppercase: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date }
  }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('validate', function mapLegacyPassword(next) {
  if (!this.passwordHash && this.password) this.passwordHash = this.password;
  next();
});

module.exports = mongoose.model('User', userSchema);