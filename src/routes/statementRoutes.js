// routes/statementRoutes.js
const express = require("express");
const router = express.Router();
const { getStatement } = require("../controllers/statementController");

router.get("/:accountId/statement", getStatement);

module.exports = router;
