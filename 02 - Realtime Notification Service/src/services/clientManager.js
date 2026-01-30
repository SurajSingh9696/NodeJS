/**
 * Client Manager
 * Manages API keys and client connections
 */

import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { database } from '../database/storage.js';
import { AuthenticationError, ValidationError } from '../errors/customErrors.js';

export class ClientManager {
  static #instance = null;
  #apiKeys = new Map(); // apiKey -> { name, createdAt, connections: Set, stats }
  #connections = new Map(); // connectionId -> { apiKey, channels: Set }

  constructor() {
    if (ClientManager.#instance) {
      return ClientManager.#instance;
    }
    
    // Load API keys from database
    this.#loadFromDatabase();
    
    ClientManager.#instance = this;
  }

  /**
   * Load API keys from database
   */
  #loadFromDatabase() {
    try {
      const apiKeys = database.getAllApiKeys();
      
      logger.info('Loading API keys from database', { rawCount: Object.keys(apiKeys).length });
      
      for (const [apiKey, data] of Object.entries(apiKeys)) {
        this.#apiKeys.set(apiKey, {
          ...data,
          connections: new Set(),
          stats: data.stats || {
            totalConnections: 0,
            totalNotifications: 0,
            lastActivity: new Date()
          }
        });
        logger.info('API key loaded', { apiKey: apiKey.substring(0, 8) + '...', name: data.name });
      }
      
      logger.info('API keys loaded from database', { count: this.#apiKeys.size });
    } catch (error) {
      logger.error('Failed to load API keys from database', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Generate a new API key
   */
  generateApiKey(clientName, userId = null) {
    if (!clientName || typeof clientName !== 'string') {
      throw new ValidationError('Client name is required');
    }

    const apiKey = randomBytes(config.get('security.apiKeyLength')).toString('hex');
    
    const keyData = {
      name: clientName,
      userId,
      createdAt: new Date(),
      connections: new Set(),
      stats: {
        totalConnections: 0,
        totalNotifications: 0,
        lastActivity: new Date()
      }
    };
    
    this.#apiKeys.set(apiKey, keyData);
    
    // Save to database
    database.saveApiKey(apiKey, keyData);

    logger.info('API key generated', { clientName, apiKey: apiKey.substring(0, 8) + '...' });

    return apiKey;
  }

  /**
   * Validate API key
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      logger.warn('Invalid API key format', { apiKey });
      throw new AuthenticationError('Invalid API key format');
    }

    logger.info('Validating API key', { 
      apiKey: apiKey.substring(0, 8) + '...', 
      exists: this.#apiKeys.has(apiKey),
      totalKeys: this.#apiKeys.size 
    });

    if (!this.#apiKeys.has(apiKey)) {
      logger.warn('API key not found', { 
        apiKey: apiKey.substring(0, 8) + '...',
        availableKeys: Array.from(this.#apiKeys.keys()).map(k => k.substring(0, 8) + '...')
      });
      throw new AuthenticationError('Invalid API key');
    }

    return true;
  }

  /**
   * Get client info by API key
   */
  getClientInfo(apiKey) {
    this.validateApiKey(apiKey);
    const client = this.#apiKeys.get(apiKey);
    
    return {
      name: client.name,
      createdAt: client.createdAt,
      activeConnections: client.connections.size,
      stats: client.stats
    };
  }

  /**
   * Register a new connection
   */
  registerConnection(connectionId, apiKey) {
    this.validateApiKey(apiKey);

    const client = this.#apiKeys.get(apiKey);
    const maxClients = config.get('client.maxClientsPerApiKey');

    if (client.connections.size >= maxClients) {
      throw new ValidationError(`Maximum connections (${maxClients}) reached for this API key`);
    }

    client.connections.add(connectionId);
    client.stats.totalConnections++;
    client.stats.lastActivity = new Date();

    this.#connections.set(connectionId, {
      apiKey,
      channels: new Set(),
      connectedAt: new Date()
    });

    logger.info('Connection registered', { 
      connectionId: connectionId.substring(0, 8) + '...', 
      apiKey: apiKey.substring(0, 8) + '...',
      totalConnections: client.connections.size 
    });

    return true;
  }

  /**
   * Unregister a connection
   */
  unregisterConnection(connectionId) {
    const connection = this.#connections.get(connectionId);
    
    if (!connection) {
      return false;
    }

    const client = this.#apiKeys.get(connection.apiKey);
    if (client) {
      client.connections.delete(connectionId);
    }

    this.#connections.delete(connectionId);

    logger.info('Connection unregistered', { 
      connectionId: connectionId.substring(0, 8) + '...',
      remainingConnections: client ? client.connections.size : 0
    });

    return true;
  }

  /**
   * Subscribe connection to a channel
   */
  subscribeToChannel(connectionId, channel) {
    const connection = this.#connections.get(connectionId);
    
    if (!connection) {
      throw new ValidationError('Connection not found');
    }

    if (!channel || typeof channel !== 'string') {
      throw new ValidationError('Invalid channel name');
    }

    connection.channels.add(channel);
    logger.debug('Subscribed to channel', { connectionId: connectionId.substring(0, 8) + '...', channel });

    return true;
  }

  /**
   * Unsubscribe connection from a channel
   */
  unsubscribeFromChannel(connectionId, channel) {
    const connection = this.#connections.get(connectionId);
    
    if (!connection) {
      return false;
    }

    connection.channels.delete(channel);
    logger.debug('Unsubscribed from channel', { connectionId: connectionId.substring(0, 8) + '...', channel });

    return true;
  }

  /**
   * Get all connections subscribed to a channel
   */
  getConnectionsByChannel(channel) {
    const connections = [];
    
    for (const [connectionId, connection] of this.#connections) {
      if (connection.channels.has(channel)) {
        connections.push(connectionId);
      }
    }

    return connections;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(connectionId) {
    return this.#connections.get(connectionId);
  }

  /**
   * Update notification stats
   */
  updateNotificationStats(apiKey) {
    const client = this.#apiKeys.get(apiKey);
    if (client) {
      client.stats.totalNotifications++;
      client.stats.lastActivity = new Date();
      
      // Update in database
      database.updateApiKeyStats(apiKey, client.stats);
    }
  }

  /**
   * Get all API keys
   */
  getAllApiKeys() {
    const keys = [];
    for (const [apiKey, client] of this.#apiKeys) {
      keys.push({
        apiKey,
        name: client.name,
        createdAt: client.createdAt,
        activeConnections: client.connections.size,
        stats: client.stats
      });
    }
    return keys;
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(apiKey) {
    const client = this.#apiKeys.get(apiKey);
    
    if (!client) {
      throw new ValidationError('API key not found');
    }

    // Remove all connections associated with this API key
    for (const connectionId of client.connections) {
      this.#connections.delete(connectionId);
    }

    this.#apiKeys.delete(apiKey);
    
    // Delete from database
    database.deleteApiKey(apiKey);
    
    logger.info('API key revoked', { apiKey: apiKey.substring(0, 8) + '...' });

    return true;
  }
}

// Export singleton instance
export const clientManager = new ClientManager();
