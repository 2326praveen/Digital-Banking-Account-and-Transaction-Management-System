// tests/interest.test.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Transaction = require("../src/models/Transaction");
const InterestRecord = require("../src/models/InterestRecord");
const { processAccountInterest, getCurrentPeriod } = require("../src/services/interestService");

let mongoServer;

beforeAll(async () => {
  process.env.ANNUAL_INTEREST_RATE = "4";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Transaction.deleteMany({});
  await InterestRecord.deleteMany({});
});

function fakeAccount(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    type: "SAVINGS",
    status: "ACTIVE",
    balance: 12000,
    save: async function () {},
    ...overrides,
  };
}

describe("Interest Calculation", () => {
  test("active savings account receives interest", async () => {
    const account = fakeAccount();
    const result = await processAccountInterest(account);
    expect(result.skipped).toBe(false);
    expect(result.interestAmount).toBeCloseTo(40, 1); // 12000 * 4/12/100
  });

  test("current account does not receive interest", async () => {
    const account = fakeAccount({ type: "CURRENT" });
    const result = await processAccountInterest(account);
    expect(result.skipped).toBe(true);
  });

  test("frozen account does not receive interest", async () => {
    const account = fakeAccount({ status: "FROZEN" });
    const result = await processAccountInterest(account);
    expect(result.skipped).toBe(true);
  });

  test("interest creates a CREDIT ledger record", async () => {
    const account = fakeAccount();
    await processAccountInterest(account);
    const txn = await Transaction.findOne({ accountId: account._id, transactionCategory: "INTEREST" });
    expect(txn).not.toBeNull();
    expect(txn.type).toBe("CREDIT");
  });

  test("same period cannot be processed twice", async () => {
    const account = fakeAccount();
    await processAccountInterest(account);
    const secondRun = await processAccountInterest(account);
    expect(secondRun.skipped).toBe(true);
    expect(secondRun.reason).toBe("INTEREST_ALREADY_PROCESSED");
  });
});
