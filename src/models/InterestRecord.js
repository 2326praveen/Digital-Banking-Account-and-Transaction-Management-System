const mongoose = require("mongoose");

const interestRecordSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    period: {
      type: String, // e.g. "2026-09"
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    principal: {
      type: Number,
      required: true,
    },
    interestAmount: {
      type: Number,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

interestRecordSchema.index({ accountId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("InterestRecord", interestRecordSchema);
