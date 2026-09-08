require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDatabase = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const staffRoutes = require('./routes/staffRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const transferRoutes = require('./routes/transferRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ success: true, message: 'Service is healthy', data: { service: 'digital-banking' } }));
app.use('/api', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/transactions', transferRoutes);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found', errorCode: 'NOT_FOUND' }));
app.use(errorHandler);

async function autoSeed() {
  try {
    const User = require('./models/User');
    const Account = require('./models/Account');
    const bcrypt = require('bcryptjs');
    const adminExists = await User.exists({ email: 'admin@bank.com' });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      await User.create({
        name: 'System Administrator',
        email: 'admin@bank.com',
        passwordHash,
        role: 'ADMIN',
        kycStatus: 'VERIFIED',
        kyc: { pan: 'ADMIN1234A', dateOfBirth: new Date('1985-01-01'), address: 'Bank Head Office, Mumbai', phone: '9876543200' }
      });
      await User.create({
        name: 'Sarah Jenkins (Bank Staff)',
        email: 'staff@bank.com',
        passwordHash,
        role: 'BANK_STAFF',
        kycStatus: 'VERIFIED',
        kyc: { pan: 'STAFF1234B', dateOfBirth: new Date('1990-05-12'), address: 'Northstar Branch 01, Bangalore', phone: '9876543201' }
      });
      const Beneficiary = require('./models/Beneficiary');

      // First Customer
      const customer = await User.create({
        name: 'Praveen Kumar',
        email: 'customer@bank.com',
        passwordHash,
        role: 'CUSTOMER',
        kycStatus: 'VERIFIED',
        kyc: { pan: 'ABCDE1234F', dateOfBirth: new Date('1995-08-20'), address: '42 MG Road, Bangalore', phone: '9876543210' }
      });

      const acc1 = await Account.create({
        userId: customer._id,
        accountNumber: '10000001',
        type: 'SAVINGS',
        balance: 25000,
        minimumBalance: 5000,
        dailyTransferLimit: 25000,
        status: 'ACTIVE'
      });

      const acc2 = await Account.create({
        userId: customer._id,
        accountNumber: '10000002',
        type: 'CURRENT',
        balance: 50000,
        minimumBalance: 10000,
        dailyTransferLimit: 100000,
        status: 'ACTIVE'
      });

      // Second Customer (for transfers/beneficiaries)
      const customer2 = await User.create({
        name: 'Bob Smith',
        email: 'bob@bank.com',
        passwordHash,
        role: 'CUSTOMER',
        kycStatus: 'VERIFIED',
        kyc: { pan: 'XYZAB5678C', dateOfBirth: new Date('1993-03-15'), address: '12 Indiranagar, Bangalore', phone: '9876543219' }
      });

      const acc3 = await Account.create({
        userId: customer2._id,
        accountNumber: '10000003',
        type: 'SAVINGS',
        balance: 15000,
        minimumBalance: 5000,
        dailyTransferLimit: 25000,
        status: 'ACTIVE'
      });

      // Pre-seed trusted beneficiaries
      await Beneficiary.create([
        { accountId: acc1._id, beneficiaryAccountNumber: '10000003', nickname: 'Bob Smith (Savings)' },
        { accountId: acc1._id, beneficiaryAccountNumber: '10000002', nickname: 'My Current Account' },
        { accountId: acc2._id, beneficiaryAccountNumber: '10000003', nickname: 'Bob Smith (Vendor)' },
        { accountId: acc3._id, beneficiaryAccountNumber: '10000001', nickname: 'Praveen Kumar' }
      ]);

      console.log('Demo accounts & beneficiaries seeded: customer@bank.com, bob@bank.com, staff@bank.com, admin@bank.com (password: Password123!)');
    }
  } catch (err) {
    console.warn('AutoSeed notice:', err.message);
  }
}

async function startServer() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error('MONGO_URI and JWT_SECRET must be configured');
  await connectDatabase();
  await autoSeed();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };