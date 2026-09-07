const crypto = require('crypto');

function generateAccountNumber() {
  return `${Date.now()}${crypto.randomInt(100, 1000)}`.slice(-10);
}

module.exports = generateAccountNumber;