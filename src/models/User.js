const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  role: { type: String, enum: ['CUSTOMER', 'BANK_STAFF', 'ADMIN'], default: 'CUSTOMER' }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);