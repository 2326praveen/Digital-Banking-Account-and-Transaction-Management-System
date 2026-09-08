const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const { pendingAccounts } = require('../controllers/accountController');
const staffDashboardController = require('../src/controllers/staffDashboardController');
const suspiciousTransactionController = require('../src/controllers/suspiciousTransactionController');
const interestController = require('../src/controllers/interestController');

const router = express.Router();

// Module 2 & 12: Pending Account Approvals
router.get('/pending-accounts', authenticate, authorize('BANK_STAFF', 'ADMIN'), pendingAccounts);

// Module 12: Staff Monitoring Dashboard
router.get('/dashboard', authenticate, authorize('BANK_STAFF', 'ADMIN'), staffDashboardController.dashboard);

// Module 9 & 12: Flagged Suspicious Transactions
router.get('/flagged-transactions', authenticate, authorize('BANK_STAFF', 'ADMIN'), suspiciousTransactionController.getFlaggedTransactions);

// Module 11: Interest Calculation Trigger
router.post('/interest/run', authenticate, authorize('BANK_STAFF', 'ADMIN'), interestController.runInterest);

module.exports = router;