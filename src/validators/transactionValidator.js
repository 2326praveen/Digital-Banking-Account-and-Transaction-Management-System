// validators/transactionValidator.js
function validateTransactionQuery(query) {
  const errors = [];
  const { type, from, to, page, limit } = query;

  if (type && !["DEBIT", "CREDIT"].includes(type)) {
    errors.push({ field: "type", message: "Invalid transaction type" });
  }

  if (from && isNaN(Date.parse(from))) {
    errors.push({ field: "from", message: "Invalid date format" });
  }

  if (to && isNaN(Date.parse(to))) {
    errors.push({ field: "to", message: "Invalid date format" });
  }

  if (from && to && new Date(from) > new Date(to)) {
    errors.push({ field: "dateRange", message: "from date must be before to date" });
  }

  if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    errors.push({ field: "page", message: "Page must be a positive integer" });
  }

  if (limit && (Number(limit) < 1 || Number(limit) > 100)) {
    errors.push({ field: "limit", message: "Limit must be between 1 and 100" });
  }

  return errors;
}

module.exports = { validateTransactionQuery };
