const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/staffDashboardController');

const router = express.Router();

router.get('/dashboard', authMiddleware, roleMiddleware('BANK_STAFF', 'ADMIN'), asyncHandler(controller.dashboard));

module.exports = router;