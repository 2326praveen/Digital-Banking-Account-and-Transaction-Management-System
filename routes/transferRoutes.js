const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const transferController = require('../controllers/transferController');
const { validateTransfer } = require('../validators/transferValidator');

// Fund transfer route - requires authenticated CUSTOMER role
router.post(
  '/transfer',
  auth,
  role('CUSTOMER'),
  validateTransfer,
  transferController.initiateTransfer
);

module.exports = router;
