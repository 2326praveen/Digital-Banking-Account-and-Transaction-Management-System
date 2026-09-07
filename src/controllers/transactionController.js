const Transaction = require("../models/Transaction");

exports.getTransactions = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { type, from, to, page = 1, limit = 20 } = req.query;

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

    res.status(200).json({
      success: true,
      data: {
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
