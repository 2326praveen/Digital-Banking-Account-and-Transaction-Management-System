const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    type: { type: String, enum: ["DEBIT", "CREDIT", "INTEREST"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    transferId: { type: String },
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
