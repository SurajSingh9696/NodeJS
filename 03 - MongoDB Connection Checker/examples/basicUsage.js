import { mongoConnection } from '../src/index.js';

async function basicExample() {
  try {
    console.log('=== Basic MongoDB Connection Example ===\n');

    console.log('1. Connecting to MongoDB...');
    await mongoConnection.connect({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: 'test'
    });
    console.log('✓ Connected successfully\n');

    console.log('2. Checking connection status...');
    console.log(`   Connected: ${mongoConnection.isConnected()}\n`);

    console.log('3. Getting database instance...');
    const db = mongoConnection.getDatabase();
    console.log(`   Database: ${db.databaseName}\n`);

    console.log('4. Creating a test collection and inserting a document...');
    const collection = mongoConnection.getCollection('test_collection');
    const result = await collection.insertOne({
      message: 'Hello MongoDB!',
      timestamp: new Date(),
      source: 'basic-example'
    });
    console.log(`   Inserted document with ID: ${result.insertedId}\n`);

    console.log('5. Finding the inserted document...');
    const document = await collection.findOne({ _id: result.insertedId });
    console.log('   Found document:', document, '\n');

    console.log('6. Cleaning up...');
    await collection.deleteOne({ _id: result.insertedId });
    console.log('   Test document deleted\n');

    console.log('7. Getting connection state...');
    const state = mongoConnection.getConnectionState();
    console.log('   Connection State:', {
      isConnected: state.isConnected,
      lastConnectionTime: state.lastConnectionTime,
      connectionAttempts: state.connectionAttempts
    }, '\n');

    console.log('8. Disconnecting...');
    await mongoConnection.disconnect();
    console.log('✓ Disconnected successfully\n');

    console.log('=== Example Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

basicExample();
