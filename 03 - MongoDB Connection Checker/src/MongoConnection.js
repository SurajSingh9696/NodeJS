import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import { MongoHealthChecker } from './MongoHealthChecker.js';
import { DatabaseError } from './errors/DatabaseError.js';

export class MongoConnection {
  static #instance = null;
  
  #config = {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS) || 60000,
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 5000,
      heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS) || 10000,
    }
  };
  
  #connectionState = {
    isConnected: false,
    isConnecting: false,
    lastError: null,
    connectionAttempts: 0,
    lastConnectionTime: null,
    lastDisconnectionTime: null
  };
  
  #reconnectConfig = {
    enabled: process.env.MONGODB_AUTO_RECONNECT !== 'false',
    maxAttempts: parseInt(process.env.MONGODB_MAX_RECONNECT_ATTEMPTS) || 10,
    initialDelayMs: parseInt(process.env.MONGODB_RECONNECT_DELAY_MS) || 1000,
    maxDelayMs: parseInt(process.env.MONGODB_MAX_RECONNECT_DELAY_MS) || 30000,
    backoffMultiplier: parseFloat(process.env.MONGODB_BACKOFF_MULTIPLIER) || 2
  };
  
  #reconnectTimer = null;
  #healthChecker = null;
  #eventHandlers = {
    onConnect: [],
    onDisconnect: [],
    onError: [],
    onReconnect: []
  };

  constructor() {
    if (MongoConnection.#instance) {
      return MongoConnection.#instance;
    }
    MongoConnection.#instance = this;
  }

  async connect(customConfig = {}) {
    if (this.#connectionState.isConnected) {
      logger.warn('MongoDB already connected');
      return;
    }

    if (this.#connectionState.isConnecting) {
      logger.warn('MongoDB connection already in progress');
      return;
    }

    if (customConfig.uri) this.#config.uri = customConfig.uri;
    if (customConfig.dbName) this.#config.dbName = customConfig.dbName;
    if (customConfig.options) {
      this.#config.options = { ...this.#config.options, ...customConfig.options };
    }

    await this.#attemptConnection();
  }

  async #attemptConnection() {
    this.#connectionState.isConnecting = true;
    this.#connectionState.connectionAttempts++;

    try {
      logger.info('Attempting MongoDB connection', {
        uri: this.#maskUri(this.#config.uri),
        dbName: this.#config.dbName,
        attempt: this.#connectionState.connectionAttempts
      });

      this.#setupEventListeners();

      const connectionUri = `${this.#config.uri}/${this.#config.dbName}`;
      await mongoose.connect(connectionUri, this.#config.options);

      this.#connectionState.isConnected = true;
      this.#connectionState.isConnecting = false;
      this.#connectionState.lastConnectionTime = new Date();
      this.#connectionState.lastError = null;

      logger.info('MongoDB connected successfully', {
        dbName: this.#config.dbName,
        poolSize: this.#config.options.maxPoolSize
      });

      this.#initializeHealthChecker();
      this.#emitEvent('onConnect', {
        timestamp: new Date(),
        attempts: this.#connectionState.connectionAttempts
      });

      this.#connectionState.connectionAttempts = 0;

    } catch (error) {
      this.#connectionState.isConnecting = false;
      this.#connectionState.lastError = error.message;
      
      logger.error('MongoDB connection failed', {
        error: error.message,
        code: error.code,
        attempt: this.#connectionState.connectionAttempts
      });

      this.#emitEvent('onError', {
        error,
        timestamp: new Date(),
        attempts: this.#connectionState.connectionAttempts
      });

      if (this.#reconnectConfig.enabled) {
        this.#scheduleReconnect();
      } else {
        throw new DatabaseError(`MongoDB connection failed: ${error.message}`, error);
      }
    }
  }

  #setupEventListeners() {
    mongoose.connection.on('connected', () => {
      logger.debug('Mongoose connected');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected');
      this.#handleDisconnection();
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose error', { error: error.message });
      this.#emitEvent('onError', { error, timestamp: new Date() });
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Mongoose reconnected');
      this.#emitEvent('onReconnect', { timestamp: new Date() });
    });
  }

  #handleDisconnection() {
    this.#connectionState.isConnected = false;
    this.#connectionState.lastDisconnectionTime = new Date();

    if (this.#healthChecker) {
      this.#healthChecker.stopHealthChecks();
    }

    this.#emitEvent('onDisconnect', {
      timestamp: new Date()
    });

    if (this.#reconnectConfig.enabled && !this.#reconnectTimer) {
      this.#scheduleReconnect();
    }
  }

  #scheduleReconnect() {
    if (this.#connectionState.connectionAttempts >= this.#reconnectConfig.maxAttempts) {
      logger.error('Max reconnection attempts reached', {
        attempts: this.#connectionState.connectionAttempts
      });
      return;
    }

    const attempt = this.#connectionState.connectionAttempts;
    const delay = Math.min(
      this.#reconnectConfig.initialDelayMs * Math.pow(this.#reconnectConfig.backoffMultiplier, attempt),
      this.#reconnectConfig.maxDelayMs
    );

    logger.info('Scheduling MongoDB reconnection', {
      attempt: attempt + 1,
      delayMs: delay
    });

    this.#reconnectTimer = setTimeout(async () => {
      this.#reconnectTimer = null;
      await this.#attemptConnection();
    }, delay);
  }

  #initializeHealthChecker() {
    if (mongoose.connection.readyState !== 1) return;

    const healthCheckInterval = parseInt(process.env.MONGODB_HEALTH_CHECK_INTERVAL) || 30000;
    this.#healthChecker = new MongoHealthChecker(
      mongoose.connection,
      this.#config.dbName,
      healthCheckInterval
    );

    this.#healthChecker.startHealthChecks();
    logger.info('MongoDB health checker initialized');
  }

  async disconnect() {
    try {
      if (this.#reconnectTimer) {
        clearTimeout(this.#reconnectTimer);
        this.#reconnectTimer = null;
      }

      if (this.#healthChecker) {
        this.#healthChecker.stopHealthChecks();
        this.#healthChecker = null;
      }

      await mongoose.disconnect();

      this.#connectionState.isConnected = false;
      this.#connectionState.lastDisconnectionTime = new Date();

      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error during MongoDB disconnection', { error: error.message });
      throw new DatabaseError(`MongoDB disconnection failed: ${error.message}`, error);
    }
  }

  getDatabase() {
    if (!this.#connectionState.isConnected) {
      throw new DatabaseError('MongoDB not connected');
    }
    return mongoose.connection.db;
  }

  getConnection() {
    return mongoose.connection;
  }

  getModel(name, schema) {
    return mongoose.model(name, schema);
  }

  getCollection(collectionName) {
    return this.getDatabase().collection(collectionName);
  }

  isConnected() {
    return this.#connectionState.isConnected && mongoose.connection.readyState === 1;
  }

  getConnectionState() {
    return { 
      ...this.#connectionState,
      readyState: mongoose.connection.readyState 
    };
  }

  getHealthStatus() {
    if (!this.#healthChecker) {
      return {
        status: 'unavailable',
        message: 'Health checker not initialized'
      };
    }
    return this.#healthChecker.getHealthSummary();
  }

  async performHealthCheck() {
    if (!this.#healthChecker) {
      throw new DatabaseError('Health checker not initialized');
    }
    return await this.#healthChecker.performHealthCheck();
  }

  on(event, handler) {
    if (this.#eventHandlers[event]) {
      this.#eventHandlers[event].push(handler);
    } else {
      logger.warn('Unknown event type', { event });
    }
  }

  #emitEvent(event, data) {
    if (this.#eventHandlers[event]) {
      this.#eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error('Error in event handler', { event, error: error.message });
        }
      });
    }
  }

  #maskUri(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  }

  static getInstance() {
    if (!MongoConnection.#instance) {
      MongoConnection.#instance = new MongoConnection();
    }
    return MongoConnection.#instance;
  }
}

export const mongoConnection = MongoConnection.getInstance();
