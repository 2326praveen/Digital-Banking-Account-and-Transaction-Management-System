const Transaction = require("../models/Transaction");
const { validateTransactionQuery } = require("../validators/transactionValidator");

exports.getTransactions = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { type, from, to, page = 1, limit = 20 } = req.query;

    const errors = validateTransactionQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errorCode: "INVALID_PAGINATION",
        errors,
      });
    }

    const filter = { accountId };
    if (type) filter.type = type;
    if (from && to) {
      filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
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
