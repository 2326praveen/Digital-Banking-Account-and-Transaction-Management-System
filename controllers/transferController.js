const transferService = require('../services/transferService');

/**
 * Handle Fund Transfer request
 * POST /api/transactions/transfer
 */
const initiateTransfer = async (req, res, next) => {
  try {
    const { fromAccountId, beneficiaryId, amount } = req.body;
    const currentUser = req.user;

    const result = await transferService.executeTransfer({
      fromAccountId,
      beneficiaryId,
      amount,
      currentUser
    });

    return res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateTransfer
};
