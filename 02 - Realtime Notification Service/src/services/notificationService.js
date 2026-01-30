/**
 * Notification Service Core
 * Main notification processing and delivery service
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { notificationQueue } from './notificationQueue.js';
import { clientManager } from './clientManager.js';
import { ValidationError } from '../errors/customErrors.js';
import { ErrorHandler } from '../errors/errorHandler.js';

export class NotificationService {
  static #instance = null;
  #wsServer = null;
  #processing = false;
  #retryAttempts;
  #retryDelay;

  constructor() {
    if (NotificationService.#instance) {
      return NotificationService.#instance;
    }

    this.#retryAttempts = config.get('notification.retryAttempts');
    this.#retryDelay = config.get('notification.retryDelay');

    NotificationService.#instance = this;
  }

  /**
   * Set WebSocket server reference
   */
  setWebSocketServer(wsServer) {
    this.#wsServer = wsServer;
    logger.info('WebSocket server reference set in NotificationService');
  }

  /**
   * Create and send a notification
   */
  async sendNotification({ channel, data, priority, apiKey, metadata = {} }) {
    try {
      // Validate API key
      clientManager.validateApiKey(apiKey);

      // Validate channel
      if (!channel || typeof channel !== 'string') {
        throw new ValidationError('Channel is required');
      }

      // Validate data
      if (!data) {
        throw new ValidationError('Data is required');
      }

      // Create notification object
      const notification = {
        id: uuidv4(),
        channel,
        data,
        priority: priority || 5,
        metadata: {
          ...metadata,
          apiKey,
          timestamp: new Date().toISOString()
        }
      };

      // Add to queue
      notificationQueue.enqueue(notification);

      // Update stats
      clientManager.updateNotificationStats(apiKey);

      // Start processing if not already running
      if (!this.#processing) {
        this.#startProcessing();
      }

      logger.info('Notification created', {
        id: notification.id,
        channel: notification.channel,
        priority: notification.priority
      });

      return {
        success: true,
        notificationId: notification.id,
        queueSize: notificationQueue.size()
      };
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        channel,
        apiKey: apiKey?.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Broadcast notification to specific channel
   */
  async broadcastToChannel({ channel, data, priority, apiKey, excludeConnection = null }) {
    return this.sendNotification({ channel, data, priority, apiKey, metadata: { excludeConnection } });
  }

  /**
   * Send notification to specific connection
   */
  sendToConnection(connectionId, notification) {
    if (!this.#wsServer) {
      throw new Error('WebSocket server not initialized');
    }

    const client = this.#wsServer.clients.get(connectionId);
    
    if (!client || client.readyState !== client.OPEN) {
      return { success: false, reason: 'Client not connected' };
    }

    try {
      const message = JSON.stringify({
        type: 'notification',
        notification: {
          id: notification.id,
          channel: notification.channel,
          data: notification.data,
          timestamp: notification.metadata.timestamp
        }
      });

      client.send(message);

      logger.debug('Notification sent to connection', {
        connectionId: connectionId.substring(0, 8) + '...',
        notificationId: notification.id
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to send to connection', {
        connectionId: connectionId.substring(0, 8) + '...',
        error: error.message
      });
      return { success: false, reason: error.message };
    }
  }

  /**
   * Start processing queue
   */
  #startProcessing() {
    if (this.#processing) {
      return;
    }

    this.#processing = true;
    this.#processQueue();
  }

  /**
   * Process notification queue
   */
  async #processQueue() {
    while (!notificationQueue.isEmpty()) {
      const batch = notificationQueue.dequeueBatch();

      for (const item of batch) {
        await this.#processNotification(item);
      }

      // Small delay between batches
      await this.#sleep(10);
    }

    this.#processing = false;
  }

  /**
   * Process a single notification
   */
  async #processNotification(item) {
    const { notification, attempts } = item;
    const { channel, metadata } = notification;

    try {
      // Get all connections subscribed to this channel
      const connections = clientManager.getConnectionsByChannel(channel);

      if (connections.length === 0) {
        logger.debug('No connections for channel', { 
          channel, 
          notificationId: notification.id 
        });
        return;
      }

      // Send to all connections
      const results = [];
      for (const connectionId of connections) {
        // Skip excluded connection if specified
        if (metadata.excludeConnection && connectionId === metadata.excludeConnection) {
          continue;
        }

        const result = this.sendToConnection(connectionId, notification);
        results.push({ connectionId, ...result });
      }

      // Log delivery statistics
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('Notification processed', {
        notificationId: notification.id,
        channel,
        successful,
        failed,
        totalConnections: connections.length
      });

    } catch (error) {
      logger.error('Error processing notification', {
        notificationId: notification.id,
        attempts: attempts + 1,
        error: error.message
      });

      // Retry logic
      if (attempts < this.#retryAttempts) {
        item.attempts++;
        await this.#sleep(this.#retryDelay);
        notificationQueue.enqueue(notification);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      queue: notificationQueue.getStats(),
      processing: this.#processing,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sleep utility
   */
  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
