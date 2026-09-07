// routes/suspiciousTransactionRoutes.js
const express = require("express");
const router = express.Router();
const { getFlaggedTransactions } = require("../controllers/suspiciousTransactionController");

router.get("/flagged-transactions", getFlaggedTransactions);

module.exports = router;
