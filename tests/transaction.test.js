// tests/transaction.test.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Transaction = require("../src/models/Transaction");

let mongoServer;

beforeAll(async () => {
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

describe("Transaction Ledger", () => {
  const accountId = new mongoose.Types.ObjectId();

  test("creates a valid DEBIT transaction", async () => {
    const txn = await Transaction.create({
      accountId,
      type: "DEBIT",
      amount: 1000,
      balanceAfter: 9000,
    });
    expect(txn.type).toBe("DEBIT");
    expect(txn.status).toBe("SUCCESS");
  });

  test("rejects invalid transaction type", async () => {
    await expect(
      Transaction.create({
        accountId,
        type: "INVALID",
        amount: 1000,
        balanceAfter: 9000,
      })
    ).rejects.toThrow();
  });

  test("rejects negative amount", async () => {
    await expect(
      Transaction.create({
        accountId,
        type: "DEBIT",
        amount: -100,
        balanceAfter: 9000,
      })
    ).rejects.toThrow();
  });

  test("pagination returns correct slice", async () => {
