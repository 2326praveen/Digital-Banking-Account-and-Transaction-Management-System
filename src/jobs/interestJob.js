const { processAccountInterest } = require("../services/interestService");

async function runInterestJob(Account) {
  const results = [];

  try {
    const savingsAccounts = await Account.find({
      type: "SAVINGS",
      status: "ACTIVE",
    });

    for (const account of savingsAccounts) {
      const result = await processAccountInterest(account);
      results.push({ accountId: account._id, ...result });
    }

    return { success: true, results };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = runInterestJob;
