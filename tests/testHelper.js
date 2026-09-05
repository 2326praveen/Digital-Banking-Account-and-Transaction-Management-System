const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const Counter = require('../models/Counter');
const { resetOutgoingTransfersStore } = require('../utils/transactionHelpers');

let replSet = null;

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
process.env.JWT_SECRET = JWT_SECRET;

/**
 * Setup in-memory MongoDB replica set for multi-document transaction testing
 */
const fs = require('fs');
const path = require('path');

const setupTestDB = () => {
  beforeAll(async () => {
    const defaultCachedBinary = 'C:\\Users\\user\\.cache\\mongodb-binaries\\mongod-x64-win32-8.2.6.exe';
    const binaryOpts = {};
    if (process.env.MONGOMS_SYSTEM_BINARY) {
      binaryOpts.systemBinary = process.env.MONGOMS_SYSTEM_BINARY;
    } else if (fs.existsSync(defaultCachedBinary)) {
      binaryOpts.systemBinary = defaultCachedBinary;
    }

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      binary: binaryOpts
    });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
  }, 120000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  }, 60000);

  beforeEach(async () => {
    // Clean all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    resetOutgoingTransfersStore();
  });
};

/**
 * Generate a valid JWT token for a given user
 */
const generateToken = (userId, role = 'CUSTOMER') => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

module.exports = {
  setupTestDB,
  generateToken
};
