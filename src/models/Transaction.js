const mongoose = require("mongoose");

let lastTimestamp = 0;

function getMonotonicTimestamp() {
  const now = Date.now();
  lastTimestamp = Math.max(now, lastTimestamp + 1);
  return new Date(lastTimestamp);
}

const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    relatedAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    transferId: {
      type: String,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
    transactionCategory: {
      type: String,
      default: null, // e.g. "INTEREST"
    },
  },
  { timestamps: { currentTime: getMonotonicTimestamp } }
);

transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ flagged: 1, createdAt: -1 });
transactionSchema.index({ transferId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
