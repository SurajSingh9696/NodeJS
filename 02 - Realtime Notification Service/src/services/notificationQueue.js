/**
 * Notification Queue
 * Manages notification queueing with priority and expiry
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { QueueFullError, ValidationError } from '../errors/customErrors.js';

export class NotificationQueue {
  static #instance = null;
  #queue = [];
  #maxSize;
  #messageExpiry;

  constructor() {
    if (NotificationQueue.#instance) {
      return NotificationQueue.#instance;
    }

    this.#maxSize = config.get('notification.maxQueueSize');
    this.#messageExpiry = config.get('notification.messageExpiry');

    // Cleanup expired messages periodically
    this.#startCleanupJob();

    NotificationQueue.#instance = this;
  }

  /**
   * Add notification to queue
   */
  enqueue(notification) {
    this.#validateNotification(notification);

    if (this.#queue.length >= this.#maxSize) {
      throw new QueueFullError(`Queue size limit reached (${this.#maxSize})`);
    }

    const queueItem = {
      id: notification.id,
      notification,
      priority: notification.priority || 5,
      enqueuedAt: Date.now(),
      expiresAt: Date.now() + this.#messageExpiry,
      attempts: 0
    };

    this.#queue.push(queueItem);
    this.#sortQueue();

    logger.debug('Notification enqueued', {
      id: notification.id,
      channel: notification.channel,
      queueSize: this.#queue.length
    });

    return queueItem;
  }

  /**
   * Get next notification from queue
   */
  dequeue() {
    const now = Date.now();
    
    // Remove expired messages first
    this.#queue = this.#queue.filter(item => item.expiresAt > now);

    if (this.#queue.length === 0) {
      return null;
    }

    return this.#queue.shift();
  }

  /**
   * Get multiple notifications
   */
  dequeueBatch(size) {
    const batchSize = Math.min(size || config.get('notification.batchSize'), this.#queue.length);
    const batch = [];

    for (let i = 0; i < batchSize; i++) {
      const item = this.dequeue();
      if (item) {
        batch.push(item);
      }
    }

    return batch;
  }

  /**
   * Peek at next notification without removing
   */
  peek() {
    if (this.#queue.length === 0) {
      return null;
    }

    return this.#queue[0];
  }

  /**
   * Get queue size
   */
  size() {
    return this.#queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.#queue.length === 0;
  }

  /**
   * Clear the queue
   */
  clear() {
    const size = this.#queue.length;
    this.#queue = [];
    logger.info('Queue cleared', { clearedItems: size });
    return size;
  }

  /**
   * Validate notification structure
   */
  #validateNotification(notification) {
    if (!notification || typeof notification !== 'object') {
      throw new ValidationError('Notification must be an object');
    }

    if (!notification.id) {
      throw new ValidationError('Notification must have an id');
    }

    if (!notification.channel) {
      throw new ValidationError('Notification must have a channel');
    }

    if (!notification.data) {
      throw new ValidationError('Notification must have data');
    }

    if (notification.priority !== undefined) {
      if (typeof notification.priority !== 'number' || notification.priority < 1 || notification.priority > 10) {
        throw new ValidationError('Priority must be a number between 1 and 10');
      }
    }
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  #sortQueue() {
    this.#queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  /**
   * Start cleanup job for expired messages
   */
  #startCleanupJob() {
    setInterval(() => {
      const before = this.#queue.length;
      const now = Date.now();
      
      this.#queue = this.#queue.filter(item => item.expiresAt > now);
      
      const removed = before - this.#queue.length;
      if (removed > 0) {
        logger.info('Expired notifications removed', { count: removed });
      }
    }, 60000); // Run every minute
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const now = Date.now();
    const priorities = {};

    for (const item of this.#queue) {
      const priority = item.priority;
      priorities[priority] = (priorities[priority] || 0) + 1;
    }

    return {
      size: this.#queue.length,
      maxSize: this.#maxSize,
      utilizationPercent: ((this.#queue.length / this.#maxSize) * 100).toFixed(2),
      priorityDistribution: priorities,
      oldestMessage: this.#queue.length > 0 ? now - this.#queue[this.#queue.length - 1].enqueuedAt : 0
    };
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueue();
