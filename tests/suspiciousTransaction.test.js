// tests/suspiciousTransaction.test.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Transaction = require("../src/models/Transaction");
const { checkSuspicious } = require("../src/services/suspiciousTransactionService");

let mongoServer;

beforeAll(async () => {
  process.env.SUSPICIOUS_AMOUNT_THRESHOLD = "50000";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Transaction.deleteMany({});
});

describe("Suspicious Transaction Flagging", () => {
  const accountId = new mongoose.Types.ObjectId();

  test("transaction below threshold is not flagged", async () => {
    const result = await checkSuspicious(accountId, 10000);
    expect(result.flagged).toBe(false);
  });

  test("transaction above threshold is flagged", async () => {
    const result = await checkSuspicious(accountId, 60000);
    expect(result.flagged).toBe(true);
    expect(result.flagReason).toBeTruthy();
  });

  test("flag reason is stored on the transaction", async () => {
    const txn = await Transaction.create({
      accountId,
      type: "DEBIT",
      amount: 60000,
      balanceAfter: 40000,
      flagged: true,
      flagReason: "Transaction amount exceeds suspicious threshold",
    });
    expect(txn.flagReason).toBe("Transaction amount exceeds suspicious threshold");
  });
});
