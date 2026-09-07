const Transaction = require("../models/Transaction");

const ANNUAL_INTEREST_RATE = process.env.ANNUAL_INTEREST_RATE || 4;

async function runInterestJob(Account) {
  const savingsAccounts = await Account.find({ type: "SAVINGS", status: "ACTIVE" });
  const results = [];

  for (const account of savingsAccounts) {
    const monthlyRate = ANNUAL_INTEREST_RATE / 100 / 12;
    const interestAmount = Math.round(account.balance * monthlyRate * 100) / 100;

    if (interestAmount <= 0) continue;

    account.balance += interestAmount;
    await account.save();

    const txn = await Transaction.create({
      accountId: account._id,
      type: "INTEREST",
      amount: interestAmount,
      balanceAfter: account.balance,
    });

    results.push(txn);
  }

  return results;
}

module.exports = runInterestJob;
