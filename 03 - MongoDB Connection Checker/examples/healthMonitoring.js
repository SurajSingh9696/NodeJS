
import { mongoConnection } from '../src/index.js';

async function healthMonitoringExample() {
  try {
    console.log('=== MongoDB Health Monitoring Example ===\n');
    console.log('Connecting to MongoDB...');
    await mongoConnection.connect({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: 'test'
    });
    console.log('✓ Connected\n');
    console.log('Performing initial health check...');
    const initialHealth = await mongoConnection.performHealthCheck();
    console.log('\nHealth Check Results:');
    console.log(JSON.stringify(initialHealth, null, 2), '\n');
    console.log('Health Summary:');
    const summary = mongoConnection.getHealthStatus();
    console.log(JSON.stringify(summary, null, 2), '\n');
    console.log('Monitoring health for 30 seconds (checking every 5 seconds)...\n');
    
    let checkCount = 0;
    const interval = setInterval(() => {
      const health = mongoConnection.getHealthStatus();
      checkCount++;
      
      console.log(`[Check #${checkCount}] Status: ${health.status} | ` +
                  `Response Time: ${health.responseTime}ms | ` +
                  `Version: ${health.version}`);
    }, 5000);
    setTimeout(async () => {
      clearInterval(interval);
      
      console.log('\n\nFinal health check...');
      const finalHealth = await mongoConnection.performHealthCheck();
      
      if (finalHealth.isHealthy) {
        console.log('✓ MongoDB is healthy');
      } else {
        console.log('✗ MongoDB is unhealthy');
        console.log('Errors:', finalHealth.errors);
      }
      if (finalHealth.databaseStats) {
        console.log('\nDatabase Statistics:');
        console.log(`  Collections: ${finalHealth.databaseStats.collections}`);
        console.log(`  Objects: ${finalHealth.databaseStats.objects}`);
        console.log(`  Data Size: ${Math.round(finalHealth.databaseStats.dataSize / 1024)}KB`);
        console.log(`  Index Size: ${Math.round(finalHealth.databaseStats.indexSize / 1024)}KB`);
      }

      await mongoConnection.disconnect();
      console.log('\n=== Example Complete ===');
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

healthMonitoringExample();
