const Transaction = require("../models/Transaction");
const InterestRecord = require("../models/InterestRecord");

const ANNUAL_INTEREST_RATE = Number(process.env.ANNUAL_INTEREST_RATE) || 4;

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function processAccountInterest(account) {
  if (account.status !== "ACTIVE" || account.type !== "SAVINGS") {
    return { skipped: true, reason: "Not an eligible active savings account" };
  }

  const period = getCurrentPeriod();

  const alreadyProcessed = await InterestRecord.findOne({
    accountId: account._id,
    period,
  });

  if (alreadyProcessed) {
    return { skipped: true, reason: "INTEREST_ALREADY_PROCESSED" };
  }

  const monthlyRate = ANNUAL_INTEREST_RATE / 12 / 100;
  const interestAmount = Math.round(account.balance * monthlyRate * 100) / 100;

  if (interestAmount <= 0) {
    return { skipped: true, reason: "Interest amount is zero" };
  }

  const oldBalance = account.balance;
  const newBalance = oldBalance + interestAmount;

  account.balance = newBalance;
  await account.save();

  const txn = await Transaction.create({
    accountId: account._id,
    type: "CREDIT",
    amount: interestAmount,
    balanceAfter: newBalance,
    transactionCategory: "INTEREST",
    status: "SUCCESS",
  });

  await InterestRecord.create({
    accountId: account._id,
    period,
    rate: ANNUAL_INTEREST_RATE,
    principal: oldBalance,
    interestAmount,
  });

  return { skipped: false, interestAmount, newBalance, transaction: txn };
}

module.exports = { processAccountInterest, getCurrentPeriod };
