// routes/interestRoutes.js
const express = require("express");
const router = express.Router();
const { runInterest } = require("../controllers/interestController");

router.post("/interest/run", runInterest);

module.exports = router;
