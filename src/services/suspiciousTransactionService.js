// services/suspiciousTransactionService.js
const Transaction = require("../models/Transaction");

const AMOUNT_THRESHOLD = Number(process.env.SUSPICIOUS_AMOUNT_THRESHOLD) || 50000;
const COUNT_THRESHOLD = Number(process.env.SUSPICIOUS_TRANSACTION_COUNT) || 3;
const WINDOW_MINUTES = Number(process.env.SUSPICIOUS_TRANSACTION_WINDOW_MINUTES) || 30;

async function checkSuspicious(accountId, amount) {
  // Rule 1 — large single transaction
  if (amount >= AMOUNT_THRESHOLD) {
    return {
      flagged: true,
      flagReason: "Transaction amount exceeds suspicious threshold",
    };
  }

  // Rule 2 — multiple large transactions within a short window
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const recentLargeCount = await Transaction.countDocuments({
    accountId,
    type: "DEBIT",
    amount: { $gte: AMOUNT_THRESHOLD * 0.8 },
    createdAt: { $gte: windowStart },
  });

  if (recentLargeCount >= COUNT_THRESHOLD) {
    return {
      flagged: true,
      flagReason: `${COUNT_THRESHOLD}+ large transactions within ${WINDOW_MINUTES} minutes`,
    };
  }

  // Rule 3 — unusual transaction frequency
  const recentCount = await Transaction.countDocuments({
    accountId,
    createdAt: { $gte: windowStart },
  });

  if (recentCount >= 10) {
    return {
      flagged: true,
      flagReason: "Unusually high transaction frequency",
    };
  }

  return { flagged: false, flagReason: null };
}

module.exports = { checkSuspicious };
