
import { mongoConnection } from '../src/index.js';

async function eventHandlingExample() {
  console.log('=== MongoDB Event Handling Example ===\n');
  mongoConnection.on('onConnect', (data) => {
    console.log('✓ [EVENT] Connected to MongoDB');
    console.log('  Timestamp:', data.timestamp);
    console.log('  Attempts:', data.attempts);
  });

  mongoConnection.on('onDisconnect', (data) => {
    console.log('✗ [EVENT] Disconnected from MongoDB');
    console.log('  Timestamp:', data.timestamp);
  });

  mongoConnection.on('onError', (data) => {
    console.error('⚠ [EVENT] MongoDB Error');
    console.error('  Error:', data.error.message);
    console.error('  Timestamp:', data.timestamp);
    console.error('  Attempts:', data.attempts);
  });

  mongoConnection.on('onReconnect', (data) => {
    console.log('↻ [EVENT] Reconnected to MongoDB');
    console.log('  Timestamp:', data.timestamp);
  });

  try {
    console.log('Connecting to MongoDB...\n');
    
    await mongoConnection.connect({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: 'test'
    });

    console.log('\nPerforming some operations...');
    const collection = mongoConnection.getCollection('events_test');
    await collection.insertOne({ test: true, timestamp: new Date() });
    console.log('  Operation 1: Insert successful');
    
    await collection.findOne({ test: true });
    console.log('  Operation 2: Find successful');
    
    await collection.deleteMany({ test: true });
    console.log('  Operation 3: Delete successful');
    console.log('\nConnection State:');
    const state = mongoConnection.getConnectionState();
    console.log('  Connected:', state.isConnected);
    console.log('  Last Connection:', state.lastConnectionTime);
    console.log('  Connection Attempts:', state.connectionAttempts);
    console.log('\nWaiting 5 seconds before disconnecting...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\nDisconnecting...\n');
    await mongoConnection.disconnect();

    console.log('\n=== Example Complete ===');
    process.exit(0);

  } catch (error) {
    console.error('Fatal Error:', error.message);
    process.exit(1);
  }
}

eventHandlingExample();
