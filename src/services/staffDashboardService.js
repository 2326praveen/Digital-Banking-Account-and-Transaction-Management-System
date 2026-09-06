const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');

function dateRange(from, to) {
  const range = {};
  const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date : null;
  };

  if (from !== undefined) {
    const start = parseDate(from);
    if (!start) {
      throw new AppError('from must be a valid date in YYYY-MM-DD format', 400, 'INVALID_DATE_RANGE');
    }
    range.$gte = start;
  }
  if (to !== undefined) {
    const end = parseDate(to);
    if (!end) {
      throw new AppError('to must be a valid date in YYYY-MM-DD format', 400, 'INVALID_DATE_RANGE');
    }
    end.setUTCDate(end.getUTCDate() + 1);
    range.$lt = end;
  }
  if (range.$gte && range.$lt && range.$gte >= range.$lt) {
    throw new AppError('from must be before or equal to to', 400, 'INVALID_DATE_RANGE');
  }
  return range;
}

async function getDashboard(from, to) {
  const createdAt = dateRange(from, to);
  const transactionMatch = Object.keys(createdAt).length ? { createdAt } : {};

  const [customers, accountGroups, transactionStats] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER' }),
    Account.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Transaction.aggregate([
      { $match: transactionMatch },
      { $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalDebit: { $sum: { $cond: [{ $eq: ['$type', 'DEBIT'] }, '$amount', 0] } },
        totalCredit: { $sum: { $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0] } },
        flaggedTransactions: { $sum: { $cond: ['$flagged', 1, 0] } }
      } }
    ])
  ]);

  const accounts = accountGroups.reduce((result, group) => {
    result[group._id.toLowerCase()] = group.count;
    return result;
  }, { active: 0, pending: 0, frozen: 0, rejected: 0, closed: 0 });
  const transactions = transactionStats[0] || {
    totalTransactions: 0, totalDebit: 0, totalCredit: 0, flaggedTransactions: 0
  };

  return {
    customers,
    totalAccounts: Object.values(accounts).reduce((sum, count) => sum + count, 0),
    activeAccounts: accounts.active,
    pendingAccounts: accounts.pending,
    frozenAccounts: accounts.frozen,
    rejectedAccounts: accounts.rejected,
    closedAccounts: accounts.closed,
    totalTransactions: transactions.totalTransactions,
    totalDebit: transactions.totalDebit,
    totalCredit: transactions.totalCredit,
    flaggedTransactions: transactions.flaggedTransactions,
    totalTransferred: transactions.totalDebit
  };
}

module.exports = { getDashboard };