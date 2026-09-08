const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/token');

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.kyc?.phone || '', role: user.role, kycStatus: user.kycStatus };
}

async function register(req, res, next) {
  try {
    const { name, email, password, phone, pan, address, dateOfBirth } = req.body;
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, message: 'Email is already registered', errorCode: 'DUPLICATE_EMAIL' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: 'CUSTOMER', kycStatus: 'PENDING', kyc: { phone, pan, address, dateOfBirth } });
    return res.status(201).json({ success: true, message: 'Customer registered successfully', data: { userId: user._id, name: user.name, email: user.email, role: user.role, kycStatus: user.kycStatus } });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' });
    }
    return res.json({ success: true, message: 'Login successful', data: { token: generateToken(user), user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    return res.json({ success: true, message: 'Profile retrieved successfully', data: publicUser(user) });
  } catch (error) { return next(error); }
}

async function updateKyc(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: req.body.kycStatus }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    return res.json({ success: true, message: 'KYC status updated successfully', data: publicUser(user) });
  } catch (error) { return next(error); }
}

module.exports = { register, login, getProfile, updateKyc };