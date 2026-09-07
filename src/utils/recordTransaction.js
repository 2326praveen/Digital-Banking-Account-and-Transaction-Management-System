const Transaction = require("../models/Transaction");

const SUSPICIOUS_AMOUNT_THRESHOLD = process.env.SUSPICIOUS_AMOUNT_THRESHOLD || 50000;

async function recordTransaction({ accountId, type, amount, balanceAfter, transferId }) {
  let flagged = false;
  let flagReason = null;

  if (amount > SUSPICIOUS_AMOUNT_THRESHOLD) {
    flagged = true;
    flagReason = `Amount exceeds threshold of ${SUSPICIOUS_AMOUNT_THRESHOLD}`;
  }

  const txn = await Transaction.create({
    accountId,
    type,
    amount,
    balanceAfter,
    transferId,
    flagged,
    flagReason,
  });

  return txn;
}

module.exports = recordTransaction;
