
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'test';

async function viewTestResults() {
  try {
    await mongoose.connect(`${uri}/${dbName}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('Test Results from Database');
    console.log('='.repeat(50) + '\n');

    const TestSchema = new mongoose.Schema({
      testName: String,
      status: String,
      connectionTime: Number,
      timestamp: Date,
      uri: String,
      database: String,
      nodeVersion: String,
      platform: String
    }, { collection: 'test' });

    const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);

    const results = await Test.find().sort({ timestamp: -1 }).limit(10);

    console.log(`Found ${results.length} test records:\n`);
    
    results.forEach((result, index) => {
      console.log(`Test #${index + 1}:`);
      console.log(`  Status: ${result.status}`);
      console.log(`  URI: ${result.uri}`);
      console.log(`  Database: ${result.database}`);
      console.log(`  Date: ${new Date(result.timestamp).toLocaleString()}`);
      console.log(`  Connection Time: ${result.connectionTime}ms`);
      console.log(`  Node Version: ${result.nodeVersion}`);
      console.log(`  Platform: ${result.platform}`);
      console.log('');
    });

    await mongoose.disconnect();
    
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

viewTestResults();
