const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { accountValidator, approvalValidator, idValidator } = require('../validators/accountValidator');
const { createAccount, listAccounts, getAccount, pendingAccounts, approveAccount, approvalHistory } = require('../controllers/accountController');
const freezeController = require('../src/controllers/freezeController');
const statementController = require('../src/controllers/statementController');
const transactionController = require('../src/controllers/transactionController');

const router = express.Router();

router.post('/', authenticate, authorize('CUSTOMER'), accountValidator, validate, createAccount);
router.get('/', authenticate, listAccounts);
router.get('/:id', authenticate, idValidator, validate, getAccount);
router.put('/:id/approve', authenticate, authorize('BANK_STAFF', 'ADMIN'), approvalValidator, validate, approveAccount);
router.get('/:id/approval-history', authenticate, idValidator, validate, approvalHistory);

// Module 10: Freeze / Unfreeze & Status History (Bank Staff & Admin)
router.put('/:id/freeze', authenticate, authorize('BANK_STAFF', 'ADMIN'), idValidator, validate, freezeController.freeze);
router.put('/:id/unfreeze', authenticate, authorize('BANK_STAFF', 'ADMIN'), idValidator, validate, freezeController.unfreeze);
router.get('/:id/status-history', authenticate, authorize('BANK_STAFF', 'ADMIN'), idValidator, validate, freezeController.statusHistory);

// Module 7: Account Statement Generation
router.get('/:id/statement', authenticate, idValidator, validate, statementController.getStatement);

// Module 6: Transaction Ledger
router.get('/:id/transactions', authenticate, idValidator, validate, transactionController.getTransactions);

module.exports = router;