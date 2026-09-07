const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const { pendingAccounts } = require('../controllers/accountController');

const router = express.Router();
router.get('/pending-accounts', authenticate, authorize('BANK_STAFF', 'ADMIN'), pendingAccounts);

module.exports = router;