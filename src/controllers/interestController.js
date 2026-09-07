const runInterestJob = require("../jobs/interestJob");
// Account model path will need adjusting once Member 1's model is merged in
const Account = require("../models/Account");

exports.runInterest = async (req, res) => {
  try {
    const result = await runInterestJob(Account);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        errorCode: "INTEREST_CALCULATION_FAILED",
      });
    }

    res.status(200).json({
      success: true,
      message: "Interest job completed",
      data: result.results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
      errorCode: "INTEREST_CALCULATION_FAILED",
    });
  }
};
