import 'dotenv/config';
import { mongoConnection } from '../src/index.js';
import mongoose from 'mongoose';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'test';
  const startTime = Date.now();

  console.log('\n' + '='.repeat(50));
  console.log('MongoDB Connection Test');
  console.log('='.repeat(50) + '\n');

  try {
    console.log('Connecting to MongoDB...');
    console.log(`URI: ${uri}`);
    console.log(`Database: ${dbName}\n`);
    
    await mongoConnection.connect({ uri, dbName });
    
    console.log(`${GREEN}✓ MongoDB Connection: SUCCESSFUL${RESET}`);
    console.log(`${GREEN}✓ Connection Status: STABLE${RESET}\n`);

    const TestSchema = new mongoose.Schema({
      testName: String,
      status: String,
      connectionTime: Number,
      timestamp: Date,
      database: String,
      nodeVersion: String,
      platform: String
    }, { collection: 'test' });

    const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);

    const connectionTime = Date.now() - startTime;

    await Test.create({
      testName: 'MongoDB Connection Test',
      status: 'successful',
      connectionTime,
      timestamp: new Date(),
      uri: uri,
      database: dbName,
      nodeVersion: process.version,
      platform: process.platform
    });

    console.log(`${GREEN}✓ Test data stored in 'test' collection${RESET}`);
    console.log(`  - URI: ${uri}`);
    console.log(`  - Database: ${dbName}`);
    console.log(`  - Connection Time: ${connectionTime}ms`);
    console.log(`  - Date: ${new Date().toLocaleString()}`);
    console.log(`  - Node: ${process.version}`);

    await mongoConnection.disconnect();
    console.log(`\n${GREEN}✓ Disconnected successfully${RESET}`);
    
    console.log('\n' + '='.repeat(50));
    console.log(`${GREEN}All Tests Passed!${RESET}`);
    console.log('='.repeat(50) + '\n');
    
    process.exit(0);

  } catch (error) {
    console.error(`\n${RED}✗ Connection Failed: ${error.message}${RESET}\n`);
    process.exit(1);
  }
}

runTests();
