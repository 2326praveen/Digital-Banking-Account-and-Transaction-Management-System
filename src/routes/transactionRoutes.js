const express = require("express");
const router = express.Router();
const {
  getHistory,
  getStatement,
  getFlagged,
  runInterest,
} = require("../controllers/transactionController");

router.get("/:id/transactions", getHistory);
router.get("/:id/statement", getStatement);
router.get("/flagged", getFlagged);
router.post("/interest/run", runInterest);

module.exports = router;
