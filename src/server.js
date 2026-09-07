const mongoose = require('mongoose');
const app = require('./app');

const port = Number(process.env.PORT || 5000);

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => console.log(`Digital Banking API listening on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = start;