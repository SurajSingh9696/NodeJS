# MongoDB Connection Checker & Health Monitor

A robust Node.js library for managing MongoDB connections with comprehensive health checking, automatic reconnection, and advanced error handling.

## Features

✅ **Robust Connection Management**
- Singleton pattern for consistent connection handling
- Connection pooling with configurable pool sizes
- Automatic reconnection with exponential backoff
- Connection state tracking and monitoring

✅ **Comprehensive Health Checking**
- Periodic health monitoring
- Database ping tests
- Server information retrieval
- Database statistics collection
- Replica set status checking

✅ **Advanced Error Handling**
- Custom error types
- Detailed error messages
- Connection retry logic
- Graceful degradation

✅ **Event System**
- Connection lifecycle events
- Error event handling
- Custom event handlers
- Real-time connection monitoring

✅ **Connection Validation**
- URI format validation
- Pre-connection testing
- Pool settings validation
- Configuration recommendations

## Installation

```bash
npm install
```

### Dependencies

- **mongodb** (^6.3.0) - Official MongoDB driver for Node.js

## Quick Start

### Basic Connection

```javascript
import { mongoConnection } from './src/index.js';

// Connect to MongoDB
await mongoConnection.connect({
  uri: 'mongodb://localhost:27017',
  dbName: 'mydb'
});

// Use database
const db = mongoConnection.getDatabase();
const collection = db.collection('users');

// Perform operations
await collection.insertOne({ name: 'John', email: 'john@example.com' });

// Disconnect when done
await mongoConnection.disconnect();
```

### Health Checking

```javascript
// Perform health check
const health = await mongoConnection.performHealthCheck();

if (health.isHealthy) {
  console.log('MongoDB is healthy!');
  console.log('Response time:', health.responseTime, 'ms');
} else {
  console.log('MongoDB is unhealthy:', health.errors);
}

// Get simple health summary
const summary = mongoConnection.getHealthStatus();
console.log('Status:', summary.status);
```

### Connection Validation

```javascript
import { MongoConnectionChecker } from './src/index.js';

// Validate and test connection
const result = await MongoConnectionChecker.checkConnection(
  'mongodb://localhost:27017'
);

console.log('Connection success:', result.success);
console.log('Server version:', result.serverInfo?.version);
console.log('Response time:', result.responseTime, 'ms');
```

## Configuration

Create a `.env` file in the project root:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=test

# Connection Pool
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=60000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000

# Health Checks
MONGODB_HEALTH_CHECK_INTERVAL=30000
MONGODB_HEARTBEAT_FREQUENCY_MS=10000

# Reconnection
MONGODB_AUTO_RECONNECT=true
MONGODB_MAX_RECONNECT_ATTEMPTS=10
MONGODB_RECONNECT_DELAY_MS=1000
MONGODB_MAX_RECONNECT_DELAY_MS=30000
MONGODB_BACKOFF_MULTIPLIER=2

# Logging
LOG_LEVEL=info
```

## API Reference

### MongoConnection

The main connection manager class (Singleton).

#### Methods

**`connect(config)`**
```javascript
await mongoConnection.connect({
  uri: 'mongodb://localhost:27017',
  dbName: 'mydb',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2
  }
});
```

**`disconnect()`**
```javascript
await mongoConnection.disconnect();
```

**`getDatabase()`**
```javascript
const db = mongoConnection.getDatabase();
```

**`getClient()`**
```javascript
const client = mongoConnection.getClient();
```

**`getCollection(name)`**
```javascript
const users = mongoConnection.getCollection('users');
```

**`isConnected()`**
```javascript
if (mongoConnection.isConnected()) {
  console.log('Connected!');
}
```

**`getConnectionState()`**
```javascript
const state = mongoConnection.getConnectionState();
console.log('Connected:', state.isConnected);
console.log('Attempts:', state.connectionAttempts);
console.log('Last Error:', state.lastError);
```

**`performHealthCheck()`**
```javascript
const health = await mongoConnection.performHealthCheck();
```

**`getHealthStatus()`**
```javascript
const summary = mongoConnection.getHealthStatus();
```

**`on(event, handler)`**
```javascript
mongoConnection.on('onConnect', (data) => {
  console.log('Connected at:', data.timestamp);
});
```

#### Events

- **`onConnect`** - Fired when connection is established
- **`onDisconnect`** - Fired when connection is lost
- **`onError`** - Fired on connection errors
- **`onReconnect`** - Fired after successful reconnection

### MongoHealthChecker

Comprehensive health monitoring for MongoDB connections.

#### Methods

**`startHealthChecks()`** - Start periodic health monitoring

**`stopHealthChecks()`** - Stop health monitoring

**`performHealthCheck()`** - Run comprehensive health check

**`getHealthStatus()`** - Get current health data

**`isHealthy()`** - Check if database is healthy

**`getHealthSummary()`** - Get simplified health summary

### MongoConnectionChecker

Static utility class for connection validation.

#### Static Methods

**`checkConnection(uri, options)`**
```javascript
const result = await MongoConnectionChecker.checkConnection(
  'mongodb://localhost:27017',
  { serverSelectionTimeoutMS: 5000 }
);
```

**`quickCheck(uri, timeout)`**
```javascript
const isReachable = await MongoConnectionChecker.quickCheck(
  'mongodb://localhost:27017',
  3000
);
```

**`validatePoolSettings(options)`**
```javascript
const validation = MongoConnectionChecker.validatePoolSettings({
  maxPoolSize: 10,
  minPoolSize: 2
});

console.log('Valid:', validation.isValid);
console.log('Warnings:', validation.warnings);
console.log('Recommendations:', validation.recommendations);
```

## Examples

The project includes several example scripts:

### Run Examples

```bash
# Basic usage
npm run example:basic

# Health monitoring
npm run example:health

# Event handling
npm run example:events

# Advanced usage
npm run example:advanced

# Connection testing
npm run test:connection
```

### Example Files

- **`examples/basicUsage.js`** - Simple connection and operations
- **`examples/healthMonitoring.js`** - Continuous health checking
- **`examples/eventHandling.js`** - Connection event handling
- **`examples/advancedUsage.js`** - Advanced features and patterns
- **`examples/testConnection.js`** - Comprehensive connection testing

## Usage Patterns

### Event-Driven Connection Management

```javascript
import { mongoConnection } from './src/index.js';

// Set up event handlers
mongoConnection.on('onConnect', ({ timestamp, attempts }) => {
  console.log(`Connected after ${attempts} attempts`);
});

mongoConnection.on('onDisconnect', () => {
  console.log('Connection lost - attempting reconnect');
});

mongoConnection.on('onError', ({ error }) => {
  console.error('Connection error:', error.message);
});

// Connect
await mongoConnection.connect();
```

### Health Monitoring for Production

```javascript
import express from 'express';
import { mongoConnection } from './src/index.js';

const app = express();

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = mongoConnection.getHealthStatus();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    status: health.status,
    database: {
      connected: mongoConnection.isConnected(),
      responseTime: health.responseTime,
      version: health.version
    },
    timestamp: new Date().toISOString()
  });
});

// Readiness probe
app.get('/ready', (req, res) => {
  const isReady = mongoConnection.isConnected() && 
                  mongoConnection.getHealthStatus().status === 'healthy';
  
  res.status(isReady ? 200 : 503).json({
    ready: isReady
  });
});
```

### Graceful Shutdown

```javascript
import { mongoConnection } from './src/index.js';

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    await mongoConnection.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
```

## Best Practices

1. **Use Environment Variables** - Store connection URIs and sensitive data in environment variables

2. **Handle Events** - Always register error handlers for production applications

3. **Graceful Shutdown** - Always disconnect on application exit

4. **Health Monitoring** - Implement health check endpoints for monitoring systems

5. **Connection Validation** - Test connections before deployment using `MongoConnectionChecker`

6. **Pool Configuration** - Tune pool settings based on your application's needs

## Troubleshooting

### Connection Timeout

```
Error: Connection failed: Connection timeout
```

**Solutions:**
- Check if MongoDB is running: `mongod --version`
- Verify the URI is correct
- Check firewall settings
- Increase `MONGODB_CONNECT_TIMEOUT_MS`

### Authentication Failed

```
Error: Authentication failed: Invalid credentials
```

**Solutions:**
- Verify username and password in the URI
- Check user permissions in MongoDB
- Ensure the authentication database is correct

### Connection Refused

```
Error: Connection failed: Connection refused
```

**Solutions:**
- Ensure MongoDB is running
- Check if MongoDB is listening on the correct port
- Verify network connectivity

### High Response Times

**Solutions:**
- Check server load and resources
- Review database indexes
- Adjust connection pool settings
- Check network latency

## Testing

The project includes a comprehensive test suite:

```bash
# Run connection tests
npm run test:connection

# Run all examples
npm run example:basic
npm run example:health
npm run example:events
npm run example:advanced
```

## Project Structure

```
03 - MongoDB Connection Checker/
├── src/
│   ├── MongoConnection.js         # Main connection manager
│   ├── MongoHealthChecker.js      # Health checking system
│   ├── MongoConnectionChecker.js  # Connection validation
│   ├── index.js                   # Main exports
│   ├── errors/
│   │   └── DatabaseError.js       # Custom error class
│   └── utils/
│       └── logger.js              # Logging utility
├── examples/
│   ├── basicUsage.js              # Basic usage example
│   ├── healthMonitoring.js        # Health monitoring example
│   ├── eventHandling.js           # Event handling example
│   ├── advancedUsage.js           # Advanced usage example
│   └── testConnection.js          # Connection testing script
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Requirements

- **Node.js** >= 18.0.0
- **MongoDB** >= 4.0

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the project repository.

---

**Made with ❤️ for reliable MongoDB connections**
