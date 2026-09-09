const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers for resolving MongoDB Atlas SRV records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if unable to set DNS servers
}

let mongoMemoryServer = null;

async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digital_banking';
  
  try {
    // Attempt connecting to the configured MongoDB with a 5-second timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected to MongoDB Atlas: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  } catch (error) {
    console.warn(`Could not connect to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}: ${error.message}`);
    console.warn('Starting in-memory MongoDB fallback server...');
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