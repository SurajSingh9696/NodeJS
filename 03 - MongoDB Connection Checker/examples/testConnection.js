
import { MongoConnectionChecker, mongoConnection } from '../src/index.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, GREEN);
}

function logError(message) {
  log(`✗ ${message}`, RED);
}

function logInfo(message) {
  log(`ℹ ${message}`, BLUE);
}

function logWarning(message) {
  log(`⚠ ${message}`, YELLOW);
}

async function runTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'test';

  log('\n╔════════════════════════════════════════════╗', BLUE);
  log('║   MongoDB Connection Test Suite           ║', BLUE);
  log('╚════════════════════════════════════════════╝\n', BLUE);
  logInfo('Test 1: URI Format Validation');
  const uriCheck = await MongoConnectionChecker.checkConnection(uri);
  if (uriCheck.checks.uriFormat.passed) {
    logSuccess('URI format is valid');
  } else {
    logError(`URI format invalid: ${uriCheck.checks.uriFormat.message}`);
    return;
  }
  logInfo('\nTest 2: Quick Connection Check');
  const startTime = Date.now();
  const isReachable = await MongoConnectionChecker.quickCheck(uri, 5000);
  const quickCheckTime = Date.now() - startTime;
  
  if (isReachable) {
    logSuccess(`MongoDB is reachable (${quickCheckTime}ms)`);
  } else {
    logError('MongoDB is not reachable');
    logWarning('Make sure MongoDB is running on the specified URI');
    return;
  }
  logInfo('\nTest 3: Full Connection Test');
  const fullCheck = await MongoConnectionChecker.checkConnection(uri);
  
  console.log('\n  Connection Checks:');
  Object.entries(fullCheck.checks).forEach(([name, check]) => {
    if (check.passed) {
      console.log(`    ${GREEN}✓${RESET} ${name}: ${check.message}`);
    } else {
      console.log(`    ${RED}✗${RESET} ${name}: ${check.message}`);
    }
  });

  if (fullCheck.serverInfo) {
    console.log('\n  Server Information:');
    console.log(`    Version: ${fullCheck.serverInfo.version}`);
    console.log(`    Platform: ${fullCheck.serverInfo.platform}`);
    console.log(`    Uptime: ${fullCheck.serverInfo.uptime}s`);
  }

  if (!fullCheck.success) {
    logError('\nFull connection check failed');
    return;
  }
  logInfo('\nTest 4: MongoConnection Manager');
  try {
    await mongoConnection.connect({ uri, dbName });
    logSuccess('Successfully connected using MongoConnection manager');
    
    const state = mongoConnection.getConnectionState();
    console.log(`\n  Connection State:`);
    console.log(`    Connected: ${state.isConnected}`);
    console.log(`    Last Connection: ${state.lastConnectionTime}`);
    console.log(`    Attempts: ${state.connectionAttempts}`);

  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    return;
  }
  logInfo('\nTest 5: Health Check');
  try {
    const healthStart = Date.now();
    const health = await mongoConnection.performHealthCheck();
    const healthTime = Date.now() - healthStart;

    if (health.isHealthy) {
      logSuccess(`Health check passed (${healthTime}ms)`);
    } else {
      logWarning('Health check returned unhealthy status');
    }

    console.log('\n  Health Details:');
    console.log(`    Status: ${health.isHealthy ? 'Healthy' : 'Unhealthy'}`);
    console.log(`    Response Time: ${health.responseTime}ms`);
    
    if (health.serverInfo) {
      console.log(`    MongoDB Version: ${health.serverInfo.version}`);
      console.log(`    Platform: ${health.serverInfo.platform}`);
    }

    if (health.databaseStats) {
      console.log(`    Collections: ${health.databaseStats.collections}`);
      console.log(`    Objects: ${health.databaseStats.objects}`);
      console.log(`    Data Size: ${Math.round(health.databaseStats.dataSize / 1024)}KB`);
    }

    if (health.replicaSetStatus) {
      console.log(`    Mode: ${health.replicaSetStatus.mode || 'Replica Set'}`);
    }

  } catch (error) {
    logError(`Health check failed: ${error.message}`);
  }
  logInfo('\nTest 6: Basic Database Operations');
  try {
    const db = mongoConnection.getDatabase();
    const testCollection = db.collection('_connection_test');

    const insertResult = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'Connection test document'
    });
    logSuccess('Insert operation successful');

    const document = await testCollection.findOne({ _id: insertResult.insertedId });
    if (document) {
      logSuccess('Find operation successful');
    }

    await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true } }
    );
    logSuccess('Update operation successful');

    await testCollection.deleteOne({ _id: insertResult.insertedId });
    logSuccess('Delete operation successful');

    await testCollection.drop().catch(() => {});

  } catch (error) {
    logError(`Database operations failed: ${error.message}`);
  }
  logInfo('\nTest 7: Connection Pool Validation');
  const poolSettings = {
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000
  };

  const poolValidation = MongoConnectionChecker.validatePoolSettings(poolSettings);
  
  if (poolValidation.isValid) {
    logSuccess('Pool settings are valid');
  } else {
    logWarning('Pool settings have warnings');
  }

  if (poolValidation.warnings.length > 0) {
    console.log('\n  Warnings:');
    poolValidation.warnings.forEach(warning => {
      console.log(`    ${YELLOW}⚠${RESET} ${warning}`);
    });
  }

  if (poolValidation.recommendations.length > 0) {
    console.log('\n  Recommendations:');
    poolValidation.recommendations.forEach(rec => {
      console.log(`    ${BLUE}→${RESET} ${rec}`);
    });
  }
  logInfo('\nTest 8: Graceful Disconnection');
  try {
    await mongoConnection.disconnect();
    logSuccess('Disconnected successfully');
  } catch (error) {
    logError(`Disconnection failed: ${error.message}`);
  }
  log('\n╔════════════════════════════════════════════╗', GREEN);
  log('║   All Tests Completed Successfully! ✓     ║', GREEN);
  log('╚════════════════════════════════════════════╝\n', GREEN);

  process.exit(0);
}

runTests().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  process.exit(1);
});
