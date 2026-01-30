import mongoose from 'mongoose';
import { logger } from './utils/logger.js';

export class MongoConnectionChecker {
  
  static async checkConnection(uri, options = {}) {
    const result = {
      success: false,
      uri: MongoConnectionChecker.#maskUri(uri),
      checks: {
        uriFormat: { passed: false, message: '' },
        connection: { passed: false, message: '' },
        authentication: { passed: false, message: '' },
        ping: { passed: false, message: '' }
      },
      serverInfo: null,
      responseTime: null,
      error: null
    };

    const startTime = Date.now();

    try {
      result.checks.uriFormat = MongoConnectionChecker.#validateUriFormat(uri);
      if (!result.checks.uriFormat.passed) {
        result.error = result.checks.uriFormat.message;
        return result;
      }

      const connectionCheck = await MongoConnectionChecker.#testConnection(uri, options);
      result.checks.connection = connectionCheck;
      
      if (!connectionCheck.passed) {
        result.error = connectionCheck.message;
        return result;
      }

      result.checks.authentication.passed = true;
      result.checks.authentication.message = 'Authentication successful';

      const pingCheck = await MongoConnectionChecker.#testPing(uri, options);
      result.checks.ping = pingCheck;
      
      if (!pingCheck.passed) {
        result.error = pingCheck.message;
        return result;
      }

      result.serverInfo = await MongoConnectionChecker.#getServerInfo(uri, options);
      result.responseTime = Date.now() - startTime;
      result.success = true;

      logger.info('MongoDB connection check passed', {
        responseTime: result.responseTime,
        version: result.serverInfo?.version
      });

    } catch (error) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      
      logger.error('MongoDB connection check failed', {
        error: error.message,
        responseTime: result.responseTime
      });
    }

    return result;
  }

  static #validateUriFormat(uri) {
    const result = { passed: false, message: '' };

    if (!uri || typeof uri !== 'string') {
      result.message = 'URI is required and must be a string';
      return result;
    }

    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      result.message = 'URI must start with mongodb:// or mongodb+srv://';
      return result;
    }

    const uriPattern = /^mongodb(\+srv)?:\/\//;
    if (!uriPattern.test(uri)) {
      result.message = 'Invalid MongoDB URI format';
      return result;
    }

    result.passed = true;
    result.message = 'URI format is valid';
    return result;
  }

  static async #testConnection(uri, options) {
    const result = { passed: false, message: '' };
    let connection = null;

    try {
      const connectionOptions = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        ...options
      };

      connection = await mongoose.createConnection(uri, connectionOptions).asPromise();

      result.passed = true;
      result.message = 'Connection established successfully';

    } catch (error) {
      result.message = `Connection failed: ${error.message}`;
      
      if (error.message.includes('authentication')) {
        result.message = 'Authentication failed: Invalid credentials';
      } else if (error.message.includes('ENOTFOUND')) {
        result.message = 'Connection failed: Host not found';
      } else if (error.message.includes('ECONNREFUSED')) {
        result.message = 'Connection failed: Connection refused (check if MongoDB is running)';
      } else if (error.message.includes('timeout')) {
        result.message = 'Connection failed: Connection timeout';
      }
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }

    return result;
  }

  static async #testPing(uri, options) {
    const result = { passed: false, message: '' };
    let connection = null;

    try {
      connection = await mongoose.createConnection(uri, options).asPromise();

      const adminDb = connection.db.admin();
      const pingResult = await adminDb.ping();

      if (pingResult.ok === 1) {
        result.passed = true;
        result.message = 'Ping successful';
      } else {
        result.message = 'Ping returned non-OK status';
      }

    } catch (error) {
      result.message = `Ping failed: ${error.message}`;
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }

    return result;
  }

  static async #getServerInfo(uri, options) {
    let connection = null;

    try {
      connection = await mongoose.createConnection(uri, options).asPromise();

      const adminDb = connection.db.admin();
      const info = await adminDb.serverInfo();

      return {
        version: info.version,
        platform: info.platform,
        uptime: info.uptime,
        maxBsonObjectSize: info.maxBsonObjectSize,
        storageEngines: info.storageEngines
      };

    } catch (error) {
      logger.warn('Failed to get server info', { error: error.message });
      return null;
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }
  }

  static async quickCheck(uri, timeout = 5000) {
    let connection = null;

    try {
      connection = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: timeout,
        connectTimeoutMS: timeout
      }).asPromise();

      const adminDb = connection.db.admin();
      await adminDb.ping();
      
      return true;
    } catch (error) {
      logger.debug('Quick connection check failed', { error: error.message });
      return false;
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }
  }

  static validatePoolSettings(options) {
    const warnings = [];
    const recommendations = [];

    if (options.maxPoolSize) {
      if (options.maxPoolSize < 2) {
        warnings.push('maxPoolSize is very low, may cause performance issues');
        recommendations.push('Consider setting maxPoolSize to at least 10');
      } else if (options.maxPoolSize > 100) {
        warnings.push('maxPoolSize is very high, may consume excessive resources');
        recommendations.push('Consider reducing maxPoolSize to a reasonable value (10-50)');
      }
    }

    if (options.minPoolSize && options.maxPoolSize) {
      if (options.minPoolSize > options.maxPoolSize) {
        warnings.push('minPoolSize cannot be greater than maxPoolSize');
      }
    }

    if (options.connectTimeoutMS) {
      if (options.connectTimeoutMS < 5000) {
        warnings.push('connectTimeoutMS is very low, may cause premature timeouts');
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  static #maskUri(uri) {
    if (!uri) return '';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  }
}
