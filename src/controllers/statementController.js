const Transaction = require("../models/Transaction");

exports.getStatement = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { from, to, type, page = 1, limit = 20 } = req.query;

    const filter = { accountId };

    if (type) {
      if (!["DEBIT", "CREDIT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
          errorCode: "INVALID_TRANSACTION_TYPE",
        });
      }
      filter.type = type;
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range",
          errorCode: "INVALID_DATE_RANGE",
        });
      }
      filter.createdAt = { $gte: fromDate, $lte: toDate };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalDebit = transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCredit = transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance =
      transactions.length > 0 ? transactions[0].balanceAfter : null;

    res.status(200).json({
      success: true,
      data: {
        accountId,
        currentBalance,
        totalDebit,
        totalCredit,
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
