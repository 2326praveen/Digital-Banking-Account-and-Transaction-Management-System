// routes/transactionRoutes.js
const express = require("express");
const router = express.Router();
const { getTransactions } = require("../controllers/transactionController");

router.get("/:accountId/transactions", getTransactions);

module.exports = router;
