const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const { setupTestDB, generateToken } = require('./testHelper');

describe('Module 4: Beneficiary Management API', () => {
  setupTestDB();

  let user1, user2;
  let tokenUser1, tokenUser2;
  let account1, account2, frozenAccount, otherUserAccount;

  beforeEach(async () => {
    // Seed users
    user1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'hashed_password_123',
      role: 'CUSTOMER'
    });

    user2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'hashed_password_456',
      role: 'CUSTOMER'
    });

    tokenUser1 = generateToken(user1._id.toString(), 'CUSTOMER');
    tokenUser2 = generateToken(user2._id.toString(), 'CUSTOMER');

    // Seed accounts
    account1 = await Account.create({
      userId: user1._id,
      accountNumber: 'ACC10001',
      balance: 10000,
      status: 'ACTIVE',
      minimumBalance: 1000,
      dailyTransferLimit: 50000
    });

    account2 = await Account.create({
      userId: user1._id,
      accountNumber: 'ACC10002',
      balance: 5000,
      status: 'ACTIVE',
      minimumBalance: 500,
      dailyTransferLimit: 25000
    });

    frozenAccount = await Account.create({
      userId: user1._id,
      accountNumber: 'ACC10003_FROZEN',
      balance: 2000,
      status: 'FROZEN',
      minimumBalance: 500,
      dailyTransferLimit: 10000
    });

    otherUserAccount = await Account.create({
      userId: user2._id,
      accountNumber: 'ACC20001',
      balance: 15000,
      status: 'ACTIVE',
      minimumBalance: 1000,
      dailyTransferLimit: 50000
    });
  });

  describe('POST /api/beneficiaries - Add Beneficiary', () => {
    it('should successfully add a valid beneficiary (201)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob Office Account'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.beneficiaryAccountNumber).toBe('ACC20001');
      expect(res.body.data.nickname).toBe('Bob Office Account');
      expect(res.body.data.accountId).toBe(account1._id.toString());
    });

    it('should reject missing authentication token (401 AUTH_REQUIRED)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob Office'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_REQUIRED');
    });

    it('should reject when source account ID is invalid format (400 INVALID_ID)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: 'invalid-object-id',
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INVALID_ID');
    });

    it('should reject non-existent source account (404 ACCOUNT_NOT_FOUND)', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: nonExistentId.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should reject when source account is owned by another user (403 ACCOUNT_NOT_OWNED)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: otherUserAccount._id.toString(),
          beneficiaryAccountNumber: 'ACC10002',
          nickname: 'Alice Second Acc'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_OWNED');
    });

    it('should reject when source account is not active (400 ACCOUNT_NOT_ACTIVE)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: frozenAccount._id.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_ACTIVE');
    });

    it('should reject when destination account number does not exist (404 BENEFICIARY_ACCOUNT_NOT_FOUND)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'NON_EXISTENT_ACC_99999',
          nickname: 'Ghost Account'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_ACCOUNT_NOT_FOUND');
    });

    it('should reject self-beneficiary when destination is the same account (400 SELF_BENEFICIARY)', async () => {
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'ACC10001',
          nickname: 'My Same Account'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('SELF_BENEFICIARY');
    });

    it('should reject duplicate beneficiary for the same source account (409 DUPLICATE_BENEFICIARY)', async () => {
      // First create
      await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob'
        });

      // Second create with same source account & same destination account number
      const res = await request(app)
        .post('/api/beneficiaries')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          accountId: account1._id.toString(),
          beneficiaryAccountNumber: 'ACC20001',
          nickname: 'Bob Duplicate'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('DUPLICATE_BENEFICIARY');
    });
  });

  describe('GET /api/beneficiaries/account/:accountId - List Beneficiaries', () => {
    it('should list all beneficiaries for own account (200)', async () => {
      await Beneficiary.create([
        { accountId: account1._id, beneficiaryAccountNumber: 'ACC20001', nickname: 'Bob' },
        { accountId: account1._id, beneficiaryAccountNumber: 'ACC10002', nickname: 'My Second Acc' }
      ]);

      const res = await request(app)
        .get(`/api/beneficiaries/account/${account1._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should reject listing beneficiaries for another user account (403 ACCOUNT_NOT_OWNED)', async () => {
      const res = await request(app)
        .get(`/api/beneficiaries/account/${otherUserAccount._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('ACCOUNT_NOT_OWNED');
    });
  });

  describe('GET /api/beneficiaries/:id - Get Single Beneficiary', () => {
    it('should fetch own single beneficiary by ID (200)', async () => {
      const ben = await Beneficiary.create({
        accountId: account1._id,
        beneficiaryAccountNumber: 'ACC20001',
        nickname: 'Bob'
      });

      const res = await request(app)
        .get(`/api/beneficiaries/${ben._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(ben._id.toString());
      expect(res.body.data.nickname).toBe('Bob');
    });

    it('should reject fetching another user single beneficiary (403 BENEFICIARY_NOT_OWNED)', async () => {
      const ben = await Beneficiary.create({
        accountId: otherUserAccount._id,
        beneficiaryAccountNumber: 'ACC10001',
        nickname: 'Alice'
      });

      const res = await request(app)
        .get(`/api/beneficiaries/${ben._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_NOT_OWNED');
    });
  });

  describe('DELETE /api/beneficiaries/:id - Delete Beneficiary', () => {
    it('should successfully delete own beneficiary (200)', async () => {
      const ben = await Beneficiary.create({
        accountId: account1._id,
        beneficiaryAccountNumber: 'ACC20001',
        nickname: 'Bob to Delete'
      });

      const res = await request(app)
        .delete(`/api/beneficiaries/${ben._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const inDb = await Beneficiary.findById(ben._id);
      expect(inDb).toBeNull();
    });

    it('should reject deleting another user beneficiary (403 BENEFICIARY_NOT_OWNED)', async () => {
      const ben = await Beneficiary.create({
        accountId: otherUserAccount._id,
        beneficiaryAccountNumber: 'ACC10001',
        nickname: 'Alice'
      });

      const res = await request(app)
        .delete(`/api/beneficiaries/${ben._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_NOT_OWNED');

      const inDb = await Beneficiary.findById(ben._id);
      expect(inDb).not.toBeNull();
    });

    it('should return 404 when deleting non-existent beneficiary (404 BENEFICIARY_NOT_FOUND)', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/beneficiaries/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('BENEFICIARY_NOT_FOUND');
    });
  });
});
