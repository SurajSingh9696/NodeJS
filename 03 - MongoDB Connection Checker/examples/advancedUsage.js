
import { MongoConnectionChecker, mongoConnection } from '../src/index.js';

async function advancedExample() {
  console.log('=== Advanced MongoDB Connection Example ===\n');

  try {
    console.log('1. Testing Multiple Connection URIs\n');
    const testUris = [
      'mongodb://localhost:27017',
      'mongodb://invalid-host:27017'
    ];

    for (const uri of testUris) {
      console.log(`   Testing: ${uri}`);
      const result = await MongoConnectionChecker.checkConnection(uri, {
        serverSelectionTimeoutMS: 3000
      });

      if (result.success) {
        console.log(`   ✓ Connected successfully`);
        console.log(`     Version: ${result.serverInfo?.version}`);
        console.log(`     Response Time: ${result.responseTime}ms\n`);
      } else {
        console.log(`   ✗ Failed: ${result.error}\n`);
      }
    }
    console.log('2. Validating Connection Pool Settings\n');
    const poolConfigs = [
      { maxPoolSize: 10, minPoolSize: 2 },
      { maxPoolSize: 1, minPoolSize: 0 },
      { maxPoolSize: 200, minPoolSize: 50 }
    ];

    poolConfigs.forEach((config, index) => {
      console.log(`   Config ${index + 1}:`, config);
      const validation = MongoConnectionChecker.validatePoolSettings(config);
      
      if (validation.isValid) {
        console.log('   ✓ Valid');
      } else {
        console.log('   ⚠ Warnings:', validation.warnings);
        console.log('   → Recommendations:', validation.recommendations);
      }
      console.log('');
    });
    console.log('3. Connecting with Custom Configuration\n');
    await mongoConnection.connect({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: 'advanced_test',
      options: {
        maxPoolSize: 15,
        minPoolSize: 5,
        connectTimeoutMS: 15000
      }
    });
    console.log('   ✓ Connected with custom configuration\n');
    console.log('4. Working with Collections\n');
    const usersCollection = mongoConnection.getCollection('users');
    const logsCollection = mongoConnection.getCollection('logs');
    const users = [
      { name: 'Alice', email: 'alice@example.com', createdAt: new Date() },
      { name: 'Bob', email: 'bob@example.com', createdAt: new Date() },
      { name: 'Charlie', email: 'charlie@example.com', createdAt: new Date() }
    ];

    const insertResult = await usersCollection.insertMany(users);
    console.log(`   Inserted ${insertResult.insertedCount} users\n`);
    console.log('5. Querying with Options\n');
    const foundUsers = await usersCollection
      .find({})
      .sort({ name: 1 })
      .limit(10)
      .toArray();
    
    console.log(`   Found ${foundUsers.length} users:`);
    foundUsers.forEach(user => {
      console.log(`     - ${user.name} (${user.email})`);
    });
    console.log('');
    console.log('6. Using Aggregation Pipeline\n');
    const stats = await usersCollection.aggregate([
      { $group: { _id: null, totalUsers: { $sum: 1 } } },
      { $project: { _id: 0, totalUsers: 1 } }
    ]).toArray();
    
    if (stats.length > 0) {
      console.log(`   Total users: ${stats[0].totalUsers}\n`);
    }
    console.log('7. Comprehensive Health Check\n');
    const health = await mongoConnection.performHealthCheck();
    console.log('   Health Status:', health.isHealthy ? '✓ Healthy' : '✗ Unhealthy');
    console.log('   Response Time:', health.responseTime + 'ms');
    
    if (health.serverInfo) {
      console.log('   Server Info:');
      console.log(`     Version: ${health.serverInfo.version}`);
      console.log(`     Platform: ${health.serverInfo.platform}`);
      console.log(`     Uptime: ${health.serverInfo.uptime}s`);
    }

    if (health.databaseStats) {
      console.log('   Database Stats:');
      console.log(`     Collections: ${health.databaseStats.collections}`);
      console.log(`     Objects: ${health.databaseStats.objects}`);
      console.log(`     Data Size: ${Math.round(health.databaseStats.dataSize / 1024)}KB`);
    }
    console.log('');
    console.log('8. Connection State Information\n');
    const state = mongoConnection.getConnectionState();
    console.log('   Connection State:');
    console.log(`     Connected: ${state.isConnected}`);
    console.log(`     Connection Time: ${state.lastConnectionTime}`);
    console.log(`     Attempts: ${state.connectionAttempts}`);
    console.log(`     Last Error: ${state.lastError || 'None'}`);
    console.log('');
    console.log('9. Cleaning Up\n');
    await usersCollection.deleteMany({});
    console.log('   ✓ Test data cleaned up\n');
    console.log('10. Disconnecting\n');
    await mongoConnection.disconnect();
    console.log('   ✓ Disconnected successfully\n');

    console.log('=== Example Complete ===');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

advancedExample();
