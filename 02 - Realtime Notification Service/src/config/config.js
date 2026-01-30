/**
 * Configuration Management System
 * Centralized configuration with validation and environment variable support
 */

export class Config {
  static #instance = null;
  #config = {};

  constructor() {
    if (Config.#instance) {
      return Config.#instance;
    }

    this.#config = {
      server: {
        host: process.env.HOST || '0.0.0.0',
        port: parseInt(process.env.PORT) || 3000,
        wsPort: parseInt(process.env.WS_PORT) || 3001
      },
      notification: {
        maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 10000,
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
        retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
        batchSize: parseInt(process.env.BATCH_SIZE) || 100,
        messageExpiry: parseInt(process.env.MESSAGE_EXPIRY) || 86400000 // 24 hours
      },
      client: {
        maxClientsPerApiKey: parseInt(process.env.MAX_CLIENTS_PER_KEY) || 1000,
        heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000,
        connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || 60000
      },
      security: {
        apiKeyLength: parseInt(process.env.API_KEY_LENGTH) || 32,
        enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 60
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        logPath: process.env.LOG_PATH || './logs'
      },
      database: {
        type: process.env.DB_TYPE || 'json',
        path: process.env.DB_PATH || './data',
        autoSave: process.env.DB_AUTO_SAVE !== 'false',
        saveInterval: parseInt(process.env.DB_SAVE_INTERVAL) || 5000
      }
    };

    Config.#instance = this;
  }

  /**
   * Get configuration value by path (e.g., 'server.port')
   */
  get(path) {
    const keys = path.split('.');
    let value = this.#config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.#config };
  }

  /**
   * Set configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.#config;

    for (const key of keys) {
      if (!(key in obj)) {
        obj[key] = {};
      }
      obj = obj[key];
    }

    obj[lastKey] = value;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (this.get('server.port') < 1 || this.get('server.port') > 65535) {
      errors.push('Invalid server port');
    }

    if (this.get('server.wsPort') < 1 || this.get('server.wsPort') > 65535) {
      errors.push('Invalid WebSocket port');
    }

    if (this.get('notification.maxQueueSize') < 1) {
      errors.push('Invalid max queue size');
    }

    if (this.get('client.heartbeatInterval') < 1000) {
      errors.push('Heartbeat interval too short (minimum 1000ms)');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    return true;
  }
}

// Export singleton instance
export const config = new Config();
