const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const { setupTestDB, generateToken } = require('./testHelper');

describe('Module 5 & 8: Fund Transfer Engine & Limit Enforcement', () => {
  setupTestDB();

  let userAlice, userBob, userCharlie;
  let tokenAlice, tokenBob;
  let accountAlice, accountBob, accountCharlie, frozenAccount, lowBalanceAccount;
  let benAliceToBob, benAliceToCharlie, benBobToAlice;

  beforeEach(async () => {
    // Seed users
    userAlice = await User.create({
      name: 'Alice',
      email: 'alice@bank.test',
      password: 'hashed_password_1',
      role: 'CUSTOMER'
    });

    userBob = await User.create({
      name: 'Bob',
      email: 'bob@bank.test',
      password: 'hashed_password_2',
      role: 'CUSTOMER'
    });

    userCharlie = await User.create({
      name: 'Charlie',
      email: 'charlie@bank.test',
      password: 'hashed_password_3',
      role: 'CUSTOMER'
    });

    tokenAlice = generateToken(userAlice._id.toString(), 'CUSTOMER');
    tokenBob = generateToken(userBob._id.toString(), 'CUSTOMER');

    // Seed accounts
    // Alice Account: balance 50,000, minBalance 5,000, dailyLimit 30,000
    accountAlice = await Account.create({
      userId: userAlice._id,
      accountNumber: '10000001',
      type: 'SAVINGS',
      balance: 50000,
      status: 'ACTIVE',
      minimumBalance: 5000,
      dailyTransferLimit: 30000
    });

    // Bob Account: balance 10,000, minBalance 1,000, dailyLimit 20,000
    accountBob = await Account.create({
      userId: userBob._id,
      accountNumber: '10000002',
      type: 'SAVINGS',
      balance: 10000,
      status: 'ACTIVE',
      minimumBalance: 1000,
      dailyTransferLimit: 20000
    });

    // Charlie Account: balance 20,000, minBalance 1,000
    accountCharlie = await Account.create({
      userId: userCharlie._id,
      accountNumber: '10000003',
      type: 'SAVINGS',
      balance: 20000,
      status: 'ACTIVE',
      minimumBalance: 1000,
      dailyTransferLimit: 50000
    });

    // Frozen destination account
    frozenAccount = await Account.create({
      userId: userCharlie._id,
      accountNumber: '10000004_FROZEN',
      type: 'SAVINGS',
      balance: 5000,
      status: 'FROZEN',
      minimumBalance: 500,
      dailyTransferLimit: 10000
    });

    // Low balance account for minimum balance & concurrency tests
    // balance 6,000, minBalance 5,000 -> max transferable is 1,000
    lowBalanceAccount = await Account.create({
      userId: userAlice._id,
      accountNumber: '10000005',
      type: 'SAVINGS',
      balance: 6000,
      status: 'ACTIVE',
      minimumBalance: 5000,
      dailyTransferLimit: 10000
    });

    // Seed beneficiaries
    benAliceToBob = await Beneficiary.create({
      accountId: accountAlice._id,
      beneficiaryAccountNumber: accountBob.accountNumber,
      nickname: 'Bob Salary'
    });

    benAliceToCharlie = await Beneficiary.create({
      accountId: accountAlice._id,
      beneficiaryAccountNumber: accountCharlie.accountNumber,
      nickname: 'Charlie Personal'
    });

    benBobToAlice = await Beneficiary.create({
      accountId: accountBob._id,
      beneficiaryAccountNumber: accountAlice.accountNumber,
      nickname: 'Alice Main'
    });
  });

  describe('Validation Sequence and Error Cases', () => {
    it('1. should reject request missing auth token (401 AUTH_REQUIRED)', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 5000
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_REQUIRED');
    });

    it('2. should reject non-existent source account (404 ACCOUNT_NOT_FOUND)', async () => {
      const nonExistentAccId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: nonExistentAccId.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 5000
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_FOUND');
    });

    it('3. should reject when source account is not owned by authenticated user (403 ACCOUNT_NOT_OWNED)', async () => {
      // Alice attempts to transfer from Bob's account
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountBob._id.toString(),
          beneficiaryId: benBobToAlice._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_OWNED');
    });

    it('4. should reject when source account status is not ACTIVE (409 ACCOUNT_NOT_ACTIVE)', async () => {
      // Make Alice account FROZEN
      await Account.findByIdAndUpdate(accountAlice._id, { status: 'FROZEN' });

      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_ACTIVE');
    });

    it('5. should reject non-existent beneficiary (404 BENEFICIARY_NOT_FOUND)', async () => {
      const nonExistentBenId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: nonExistentBenId.toString(),
          amount: 1000
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_NOT_FOUND');
    });

    it('6. should reject beneficiary belonging to another source account (403 BENEFICIARY_NOT_OWNED)', async () => {
      // Alice tries to use Bob's beneficiary with Alice's account
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benBobToAlice._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_NOT_OWNED');
    });

    it('7. should reject when destination account was deleted/not found (404 ACCOUNT_NOT_FOUND)', async () => {
      // Delete Bob's account from DB
      await Account.findByIdAndDelete(accountBob._id);

      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_FOUND');
    });

    it('8. should reject when destination account is FROZEN/inactive (409 ACCOUNT_NOT_ACTIVE)', async () => {
      // Create beneficiary pointing to frozenAccount
      const benFrozen = await Beneficiary.create({
        accountId: accountAlice._id,
        beneficiaryAccountNumber: frozenAccount.accountNumber,
        nickname: 'Frozen Friend'
      });

      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benFrozen._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_ACTIVE');
    });

    it('9. should reject self-transfer (400 SELF_TRANSFER)', async () => {
      // Create beneficiary that points to Alice's own account (bypassing normal API)
      const selfBen = await Beneficiary.create({
        accountId: accountAlice._id,
        beneficiaryAccountNumber: accountAlice.accountNumber,
        nickname: 'Self'
      });

      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: selfBen._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('SELF_TRANSFER');
    });

    it('10. should reject zero amount (400 INVALID_AMOUNT)', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INVALID_AMOUNT');
    });

    it('10. should reject negative amount (400 INVALID_AMOUNT)', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: -500
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INVALID_AMOUNT');
    });

    it('10. should reject amount with more than 2 decimal places (400 INVALID_AMOUNT)', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 100.005
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INVALID_AMOUNT');
    });

    it('11. should reject transfer exceeding account balance (409 INSUFFICIENT_BALANCE)', async () => {
      // Alice has 50,000, tries to transfer 60,000
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 60000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INSUFFICIENT_BALANCE');
    });

    it('12. should reject transfer violating minimum balance requirement (409 MINIMUM_BALANCE_VIOLATION)', async () => {
      // Alice has 50,000, minBalance is 5,000. Transferring 46,000 leaves 4,000 < 5,000
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 46000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('MINIMUM_BALANCE_VIOLATION');
    });

    it('13. should reject transfer exceeding daily transfer limit (409 DAILY_LIMIT_EXCEEDED)', async () => {
      // Alice has dailyLimit 30,000.
      // First transfer 20,000 (succeeds)
      const res1 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 20000
        });
      expect(res1.status).toBe(200);

      // Second transfer of 15,000 would make total 35,000 > 30,000 limit
      const res2 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 15000
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.errorCode).toBe('DAILY_LIMIT_EXCEEDED');
    });
  });

  describe('Successful Transfers & Atomicity', () => {
    it('should successfully transfer funds and update balances accurately (200)', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 5000.50
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Transfer completed successfully');
      expect(res.body.data.fromAccount).toBe('10000001');
      expect(res.body.data.toAccount).toBe('10000002');
      expect(res.body.data.amount).toBe(5000.50);
      expect(res.body.data.remainingBalance).toBe(44999.50);
      expect(res.body.data.transferId).toMatch(/^TRF-\d{8}-\d{6}$/);

      // Verify DB balances
      const updatedAlice = await Account.findById(accountAlice._id);
      const updatedBob = await Account.findById(accountBob._id);

      expect(updatedAlice.balance).toBe(44999.50);
      expect(updatedBob.balance).toBe(15000.50);
    });

    it('should generate sequential, persistent transfer IDs', async () => {
      const res1 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToBob._id.toString(),
          amount: 1000
        });

      const res2 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: accountAlice._id.toString(),
          beneficiaryId: benAliceToCharlie._id.toString(),
          amount: 1000
        });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const id1 = res1.body.data.transferId;
      const id2 = res2.body.data.transferId;

      const seq1 = parseInt(id1.split('-')[2], 10);
      const seq2 = parseInt(id2.split('-')[2], 10);

      expect(seq2).toBe(seq1 + 1);
    });

    it('Concurrency test: two simultaneous transfers violating minimum balance must not both succeed', async () => {
      // lowBalanceAccount has balance: 6,000, minBalance: 5,000 -> only 1,000 can be transferred
      // Create beneficiary for lowBalanceAccount to Bob
      const benLowToBob = await Beneficiary.create({
        accountId: lowBalanceAccount._id,
        beneficiaryAccountNumber: accountBob.accountNumber,
        nickname: 'Bob Low'
      });

      // Fire two concurrent transfers of 800 each (total 1600 > 1000 available above minBalance)
      const req1 = request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: lowBalanceAccount._id.toString(),
          beneficiaryId: benLowToBob._id.toString(),
          amount: 800
        });

      const req2 = request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          fromAccountId: lowBalanceAccount._id.toString(),
          beneficiaryId: benLowToBob._id.toString(),
          amount: 800
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one should succeed (200) and one should fail (409)
      expect(statuses).toEqual([200, 409]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 409 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(failRes.body.success).toBe(false);
      expect(failRes.body.errorCode).toBe('MINIMUM_BALANCE_VIOLATION');

      // Final balance must be 6000 - 800 = 5200 (never dropping below 5000)
      const finalLowAccount = await Account.findById(lowBalanceAccount._id);
      expect(finalLowAccount.balance).toBe(5200);
    });
  });
});
