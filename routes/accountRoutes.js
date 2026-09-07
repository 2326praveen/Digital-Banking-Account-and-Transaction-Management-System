const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { accountValidator, approvalValidator, idValidator } = require('../validators/accountValidator');
const { createAccount, listAccounts, getAccount, pendingAccounts, approveAccount, approvalHistory } = require('../controllers/accountController');

const router = express.Router();

router.post('/', authenticate, authorize('CUSTOMER'), accountValidator, validate, createAccount);
router.get('/', authenticate, listAccounts);
router.get('/:id', authenticate, idValidator, validate, getAccount);
router.put('/:id/approve', authenticate, authorize('BANK_STAFF', 'ADMIN'), approvalValidator, validate, approveAccount);
router.get('/:id/approval-history', authenticate, idValidator, validate, approvalHistory);

module.exports = router;