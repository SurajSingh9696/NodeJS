# Quick Start Guide

## 1. Installation

```bash
cd "03 - MongoDB Connection Checker"
npm install
```

## 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection details:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=test
```

## 3. Ensure MongoDB is Running

Make sure MongoDB is installed and running on your system:

```bash
# Check if MongoDB is running
mongod --version

# Or start MongoDB (if not running)
mongod
```

## 4. Test the Connection

Run the connection test to verify everything works:

```bash
npm run test:connection
```

Expected output:
```
╔════════════════════════════════════════════╗
║   MongoDB Connection Test Suite           ║
╚════════════════════════════════════════════╝

ℹ Test 1: URI Format Validation
✓ URI format is valid

ℹ Test 2: Quick Connection Check
✓ MongoDB is reachable (15ms)

...

╔════════════════════════════════════════════╗
║   All Tests Completed Successfully! ✓     ║
╚════════════════════════════════════════════╝
```

## 5. Run Examples

Try the different examples to see the features in action:

```bash
# Basic connection and operations
npm run example:basic

# Continuous health monitoring
npm run example:health

# Event-driven connection handling
npm run example:events

# Advanced features
npm run example:advanced
```

## 6. Use in Your Own Code

```javascript
import { mongoConnection } from './src/index.js';

// Connect
await mongoConnection.connect({
  uri: process.env.MONGODB_URI,
  dbName: 'myapp'
});

// Use database
const db = mongoConnection.getDatabase();
const users = db.collection('users');

// Insert a document
await users.insertOne({ name: 'John', email: 'john@example.com' });

// Check health
const health = await mongoConnection.performHealthCheck();
console.log('Health:', health.isHealthy ? 'OK' : 'UNHEALTHY');

// Disconnect
await mongoConnection.disconnect();
```

## Common Commands

```bash
# Install dependencies
npm install

# Test connection
npm run test:connection

# Run basic example
npm run example:basic

# Run health monitoring
npm run example:health

# Run event handling example
npm run example:events

# Run advanced example
npm run example:advanced
```

## Troubleshooting

### "MongoDB is not reachable"

1. Check if MongoDB is running: `mongod --version`
2. Verify the URI in `.env` is correct
3. Ensure MongoDB is listening on the correct port (default: 27017)

### "Authentication failed"

1. Check username and password in the URI
2. Verify user exists in MongoDB: `mongo` then `show users`
3. Ensure correct authentication database

### "Module not found"

1. Make sure you're in the correct directory
2. Run `npm install` to install dependencies
3. Check that `package.json` has `"type": "module"`

## Next Steps

- Read the full [README.md](README.md) for detailed API documentation
- Explore the [examples](examples/) directory for more usage patterns
- Customize the configuration in `.env` for your needs
- Integrate into your application

## Support

For issues or questions:
1. Check the [README.md](README.md) troubleshooting section
2. Review the [examples](examples/) for similar use cases
3. Open an issue on the project repository
