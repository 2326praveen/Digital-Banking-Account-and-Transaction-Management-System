const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/freezeController');

const router = express.Router();
const staffOnly = [authMiddleware, roleMiddleware('BANK_STAFF', 'ADMIN')];

router.put('/:id/freeze', ...staffOnly, asyncHandler(controller.freeze));
router.put('/:id/unfreeze', ...staffOnly, asyncHandler(controller.unfreeze));
router.get('/:id/status-history', ...staffOnly, asyncHandler(controller.statusHistory));

module.exports = router;