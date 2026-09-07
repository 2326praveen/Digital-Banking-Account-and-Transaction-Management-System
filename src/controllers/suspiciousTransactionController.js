// controllers/suspiciousTransactionController.js
const Transaction = require("../models/Transaction");

exports.getFlaggedTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, from, to } = req.query;

    const filter = { flagged: true };
    if (from && to) {
      filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .select("-__v")
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
