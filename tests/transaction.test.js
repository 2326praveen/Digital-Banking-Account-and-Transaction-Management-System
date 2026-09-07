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
    await Transaction.create([
      { accountId, type: "DEBIT", amount: 100, balanceAfter: 9900 },
      { accountId, type: "CREDIT", amount: 200, balanceAfter: 10100 },
      { accountId, type: "DEBIT", amount: 50, balanceAfter: 10050 },
    ]);

    const transactions = await Transaction.find({ accountId })
      .sort({ createdAt: 1 })
      .skip(1)
      .limit(1);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe("CREDIT");
  });
});
