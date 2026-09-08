require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const Approval = require('../models/Approval');
const Transaction = require('../src/models/Transaction');
const AccountStatusHistory = require('../src/models/AccountStatusHistory');
const InterestRecord = require('../src/models/InterestRecord');
const connectDatabase = require('../config/db');

async function viewDatabase() {
  await connectDatabase();

  console.log('\n========================================');
  console.log('       MONGODB COLLECTIONS & DATA       ');
  console.log('========================================\n');

  // 1. Users
  const users = await User.find().lean();
  console.log(`📁 Collection: 'users' (${users.length} documents)`);
  console.table(users.map(u => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    kycStatus: u.kycStatus
  })));

  // 2. Accounts
  const accounts = await Account.find().lean();
  console.log(`\n📁 Collection: 'accounts' (${accounts.length} documents)`);
  console.table(accounts.map(a => ({
    _id: a._id.toString(),
    accountNumber: a.accountNumber,
    type: a.type,
    balance: `₹${a.balance}`,
    minBalance: `₹${a.minimumBalance}`,
    status: a.status
  })));

  // 3. Beneficiaries
  const beneficiaries = await Beneficiary.find().lean();
  console.log(`\n📁 Collection: 'beneficiaries' (${beneficiaries.length} documents)`);
  console.table(beneficiaries.map(b => ({
    _id: b._id.toString(),
    sourceAccountId: b.accountId.toString(),
    beneficiaryAcc: b.beneficiaryAccountNumber,
    nickname: b.nickname
  })));

  // 4. Transactions
  const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log(`\n📁 Collection: 'transactions' (Latest ${transactions.length} documents)`);
  console.table(transactions.map(t => ({
    _id: t._id.toString(),
    type: t.type,
    amount: `₹${t.amount}`,
    balanceAfter: `₹${t.balanceAfter}`,
    flagged: t.flagged,
    status: t.status
  })));

  // 5. Approvals
  const approvals = await Approval.find().lean();
  console.log(`\n📁 Collection: 'approvals' (${approvals.length} documents)`);
  console.table(approvals.map(appr => ({
    _id: appr._id.toString(),
    accountId: appr.accountId.toString(),
    staffId: appr.staffId.toString(),
    decision: appr.decision,
    remarks: appr.remarks
  })));

  console.log('\n========================================\n');
  process.exit(0);
}

viewDatabase().catch(err => {
  console.error('Error viewing database:', err);
  process.exit(1);
});
