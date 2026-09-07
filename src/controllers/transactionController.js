const Transaction = require("../models/Transaction");

exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const txns = await Transaction.find({ accountId: req.params.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStatement = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { accountId: req.params.id };
    if (from && to) {
      filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    const totalDebit = txns.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    const totalCredit =
