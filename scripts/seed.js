require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');
const connectDatabase = require('../config/db');

async function seedDatabase() {
  await connectDatabase();

  console.log('Seeding initial banking actors and accounts...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Admin User
  const admin = await User.findOneAndUpdate(
    { email: 'admin@bank.com' },
    {
      name: 'System Administrator',
      email: 'admin@bank.com',
      passwordHash,
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
      kyc: {
        pan: 'ADMIN1234A',
        dateOfBirth: new Date('1985-01-01'),
        address: 'Bank Head Office, Mumbai',
        phone: '9876543200'
      }
    },
    { upsert: true, new: true }
  );
  console.log('✔ Admin provisioned: admin@bank.com / Password123!');

  // 2. Bank Staff User
  const staff = await User.findOneAndUpdate(
    { email: 'staff@bank.com' },
    {
      name: 'Sarah Jenkins (Bank Officer)',
      email: 'staff@bank.com',
      passwordHash,
      role: 'BANK_STAFF',
      kycStatus: 'VERIFIED',
      kyc: {
        pan: 'STAFF1234B',
        dateOfBirth: new Date('1990-05-12'),
        address: 'Northstar Branch 01, Bangalore',
        phone: '9876543201'
      }
    },
    { upsert: true, new: true }
  );
  console.log('✔ Bank Staff provisioned: staff@bank.com / Password123!');

  // 3. Customer (Verified)
  const customer = await User.findOneAndUpdate(
    { email: 'customer@bank.com' },
    {
      name: 'Praveen Kumar',
      email: 'customer@bank.com',
      passwordHash,
      role: 'CUSTOMER',
      kycStatus: 'VERIFIED',
      kyc: {
        pan: 'ABCDE1234F',
        dateOfBirth: new Date('1995-08-20'),
        address: '42 MG Road, Bangalore',
        phone: '9876543210'
      }
    },
    { upsert: true, new: true }
  );
  console.log('✔ Verified Customer provisioned: customer@bank.com / Password123!');

  // 4. Create Active Accounts for Verified Customer if none exist
  const existingAcc = await Account.findOne({ userId: customer._id });
  if (!existingAcc) {
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

    console.log('✔ Created Active Accounts: 10000001 (₹25,000) & 10000002 (₹50,000)');
  }

  // 5. Customer (Pending KYC)
  const pendingCustomer = await User.findOneAndUpdate(
    { email: 'pending@bank.com' },
    {
      name: 'Alex Pending',
      email: 'pending@bank.com',
      passwordHash,
      role: 'CUSTOMER',
      kycStatus: 'PENDING',
      kyc: {
        pan: 'PENDG1234P',
        dateOfBirth: new Date('1998-11-10'),
        address: '10 Park Avenue, Chennai',
        phone: '9876543299'
      }
    },
    { upsert: true, new: true }
  );
  console.log('✔ Pending KYC Customer provisioned: pending@bank.com / Password123!');

  console.log('\n✅ Database seeding complete!');
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
