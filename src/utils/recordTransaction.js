const Transaction = require("../models/Transaction");
const { checkSuspicious } = require("../services/suspiciousTransactionService");

async function recordTransaction({
  accountId,
  type,
  amount,
  balanceAfter,
  relatedAccount = null,
  transferId,
}) {
  let flagged = false;
  let flagReason = null;

  // Only check the DEBIT side per spec's flagging policy
  if (type === "DEBIT") {
    const result = await checkSuspicious(accountId, amount);
    flagged = result.flagged;
    flagReason = result.flagReason;
  }

  const txn = await Transaction.create({
    accountId,
    type,
    amount,
    balanceAfter,
    relatedAccount,
    transferId,
    flagged,
    flagReason,
    status: "SUCCESS",
  });

  return txn;
}

module.exports = recordTransaction;
