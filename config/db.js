const mongoose = require('mongoose');

let mongoMemoryServer = null;

async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digital_banking';
  
  try {
    // Attempt connecting to the configured MongoDB with a 2-second timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`Connected to MongoDB: ${uri}`);
  } catch (error) {
    console.warn(`Could not connect to MongoDB at ${uri}. Starting in-memory MongoDB server...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`Connected to In-Memory MongoDB at ${memUri}`);
    } catch (memError) {
      console.error('Failed to start in-memory MongoDB:', memError.message);
      throw error;
    }
  }
}

module.exports = connectDatabase;