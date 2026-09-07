// validators/statementValidator.js
const { validateTransactionQuery } = require("./transactionValidator");

// Statement uses the same query shape as transaction history
function validateStatementQuery(query) {
  return validateTransactionQuery(query);
}

module.exports = { validateStatementQuery };
