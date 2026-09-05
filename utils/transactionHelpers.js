const Counter = require('../models/Counter');

/**
 * Custom Error class for domain-specific banking errors
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Converts standard currency units (e.g., Rupees) to integer minor units (e.g., Paise).
 * Validates that amount does not exceed 2 decimal places.
 * @param {number|string} amount
 * @returns {number} Integer minor units
 */
const toMinorUnits = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
  }

  // Check decimal places: reject more than 2 decimal places
  const str = amount.toString();
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (decimals.length > 2) {
      throw new AppError('Amount cannot have more than 2 decimal places', 400, 'INVALID_AMOUNT');
    }
  }

  return Math.round(num * 100);
};

/**
 * Converts integer minor units (Paise) back to standard currency units (Rupees).
 * @param {number} minorUnits
 * @returns {number} Standard currency units rounded to 2 decimal places
 */
const toMajorUnits = (minorUnits) => {
  if (typeof minorUnits !== 'number' || isNaN(minorUnits)) {
    return 0;
  }
  return Number((minorUnits / 100).toFixed(2));
};

/**
 * Gets the current date string in YYYYMMDD format for Asia/Kolkata timezone
 * @param {Date} [date]
 * @returns {string} Date string e.g. "20260905"
 */
const getKolkataDateString = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // 'en-CA' outputs YYYY-MM-DD
  return formatter.format(date).replace(/-/g, '');
};

/**
 * Atomically generates a sequential transfer ID: TRF-YYYYMMDD-NNNNNN
 * Backed by MongoDB Counter collection for persistence across restarts & concurrency.
 * @param {Date} [date]
 * @param {ClientSession} [session] Optional mongoose session
 * @returns {Promise<string>} e.g. "TRF-20260905-000001"
 */
const generateTransferId = async (date = new Date(), session = null) => {
  const dateStr = getKolkataDateString(date);
  const counterId = `transferId:${dateStr}`;

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  };
  if (session) {
    options.session = session;
  }

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    options
  );

  const seqStr = String(counter.seq).padStart(6, '0');
  return `TRF-${dateStr}-${seqStr}`;
};

/**
 * In-memory ledger store for outgoing transfers on this branch
 * (Hook for Member 3's transaction ledger on merge)
 */
const outgoingTransfersStore = [];

/**
 * Records a successful outgoing transfer to track daily totals on this branch.
 * TODO: Replace with Member 3's Transaction model on merge.
 */
const recordOutgoingTransfer = ({ accountId, amountMinor, date = new Date(), transferId }) => {
  outgoingTransfersStore.push({
    accountId: accountId.toString(),
    amountMinor,
    date,
    transferId
  });
};

/**
 * Resets the outgoing transfers store (useful for tests)
 */
const resetOutgoingTransfersStore = () => {
  outgoingTransfersStore.length = 0;
};

/**
 * Calculates sum of today's successful outgoing transfers for this account in Asia/Kolkata.
 * Returns sum in integer minor units (paise).
 * 
 * TODO: When Member 3's Transaction ledger is merged, replace this with:
 * Transaction.aggregate([
 *   { $match: { sourceAccountId: accountId, type: 'DEBIT', status: 'SUCCESS', createdAt: { $gte: startOfDay, $lte: endOfDay } } },
 *   { $group: { _id: null, total: { $sum: '$amount' } } }
 * ])
 * 
 * @param {ObjectId|string} accountId
 * @param {Date} [date]
 * @returns {Promise<number>} Total outgoing minor units for today
 */
const getDailyOutgoingTotal = async (accountId, date = new Date()) => {
  const targetDateStr = getKolkataDateString(date);
  const accIdStr = accountId.toString();

  const totalMinor = outgoingTransfersStore
    .filter((item) => {
      return item.accountId === accIdStr && getKolkataDateString(item.date) === targetDateStr;
    })
    .reduce((sum, item) => sum + item.amountMinor, 0);

  return totalMinor;
};

module.exports = {
  AppError,
  toMinorUnits,
  toMajorUnits,
  getKolkataDateString,
  generateTransferId,
  recordOutgoingTransfer,
  resetOutgoingTransfersStore,
  getDailyOutgoingTotal
};
