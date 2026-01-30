/**
 * WebSocket Server
 * Real-time notification delivery via WebSocket connections
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { clientManager } from '../services/clientManager.js';
import { ErrorHandler } from '../errors/errorHandler.js';
import { AuthenticationError, ValidationError } from '../errors/customErrors.js';

export class NotificationWebSocketServer {
  #wss = null;
  #clients = new Map(); // connectionId -> WebSocket
  #heartbeatInterval = null;

  constructor() {
    this.#heartbeatInterval = config.get('client.heartbeatInterval');
  }

  /**
   * Initialize WebSocket server
   */
  start(port) {
    this.#wss = new WebSocketServer({ 
      port,
      perMessageDeflate: false
    });

    this.#wss.on('connection', (ws, req) => {
      this.#handleConnection(ws, req);
    });

    this.#wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    // Start heartbeat mechanism
    this.#startHeartbeat();

    logger.info('WebSocket server started', { port });

    return this.#wss;
  }

  /**
   * Handle new WebSocket connection
   */
  #handleConnection(ws, req) {
    const connectionId = uuidv4();
    let apiKey = null;
    let isAuthenticated = false;

    logger.info('New WebSocket connection', { 
      connectionId: connectionId.substring(0, 8) + '...',
      ip: req.socket.remoteAddress 
    });

    // Set connection properties
    ws.isAlive = true;
    ws.connectionId = connectionId;

    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.#handleMessage(ws, message, connectionId, apiKey, isAuthenticated);
        
        // Update authentication status
        if (message.type === 'authenticate' && !isAuthenticated) {
          isAuthenticated = true;
          apiKey = message.apiKey;
        }
      } catch (error) {
        ErrorHandler.handleWebSocketError(error, ws, { connectionId, apiKey });
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.#handleDisconnection(connectionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId: connectionId.substring(0, 8) + '...',
        error: error.message
      });
    });

    // Store connection
    this.#clients.set(connectionId, ws);

    // Send welcome message
    this.#sendMessage(ws, {
      type: 'connected',
      connectionId,
      message: 'Please authenticate with your API key'
    });
  }

  /**
   * Handle incoming messages
   */
  async #handleMessage(ws, message, connectionId, apiKey, isAuthenticated) {
    const { type } = message;

    logger.debug('Received message', { 
      type, 
      connectionId: connectionId.substring(0, 8) + '...' 
    });

    switch (type) {
      case 'authenticate':
        await this.#handleAuthenticate(ws, message, connectionId);
        break;

      case 'subscribe':
        if (!isAuthenticated) {
          throw new AuthenticationError('Not authenticated');
        }
        await this.#handleSubscribe(ws, message, connectionId);
        break;

      case 'unsubscribe':
        if (!isAuthenticated) {
          throw new AuthenticationError('Not authenticated');
        }
        await this.#handleUnsubscribe(ws, message, connectionId);
        break;

      case 'ping':
        this.#sendMessage(ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        throw new ValidationError(`Unknown message type: ${type}`);
    }
  }

  /**
   * Handle authentication
   */
  async #handleAuthenticate(ws, message, connectionId) {
    const { apiKey } = message;

    try {
      // Validate API key
      clientManager.validateApiKey(apiKey);

      // Register connection
      clientManager.registerConnection(connectionId, apiKey);

      this.#sendMessage(ws, {
        type: 'authenticated',
        success: true,
        message: 'Successfully authenticated'
      });

      logger.info('Client authenticated', { 
        connectionId: connectionId.substring(0, 8) + '...',
        apiKey: apiKey.substring(0, 8) + '...'
      });
    } catch (error) {
      this.#sendMessage(ws, {
        type: 'authenticated',
        success: false,
        error: error.message
      });
      ws.close();
      throw error;
    }
  }

  /**
   * Handle channel subscription
   */
  async #handleSubscribe(ws, message, connectionId) {
    const { channel } = message;

    try {
      clientManager.subscribeToChannel(connectionId, channel);

      this.#sendMessage(ws, {
        type: 'subscribed',
        success: true,
        channel,
        message: `Subscribed to channel: ${channel}`
      });

      logger.info('Client subscribed', { 
        connectionId: connectionId.substring(0, 8) + '...',
        channel 
      });
    } catch (error) {
      this.#sendMessage(ws, {
        type: 'subscribed',
        success: false,
        channel,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle channel unsubscription
   */
  async #handleUnsubscribe(ws, message, connectionId) {
    const { channel } = message;

    try {
      clientManager.unsubscribeFromChannel(connectionId, channel);

      this.#sendMessage(ws, {
        type: 'unsubscribed',
        success: true,
        channel,
        message: `Unsubscribed from channel: ${channel}`
      });

      logger.info('Client unsubscribed', { 
        connectionId: connectionId.substring(0, 8) + '...',
        channel 
      });
    } catch (error) {
      this.#sendMessage(ws, {
        type: 'unsubscribed',
        success: false,
        channel,
        error: error.message
      });
    }
  }

  /**
   * Handle disconnection
   */
  #handleDisconnection(connectionId) {
    clientManager.unregisterConnection(connectionId);
    this.#clients.delete(connectionId);

    logger.info('Client disconnected', { 
      connectionId: connectionId.substring(0, 8) + '...',
      remainingClients: this.#clients.size 
    });
  }

  /**
   * Send message to WebSocket client
   */
  #sendMessage(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Start heartbeat mechanism
   */
  #startHeartbeat() {
    setInterval(() => {
      for (const [connectionId, ws] of this.#clients) {
        if (ws.isAlive === false) {
          logger.warn('Terminating inactive connection', { 
            connectionId: connectionId.substring(0, 8) + '...' 
          });
          ws.terminate();
          this.#handleDisconnection(connectionId);
          continue;
        }

        ws.isAlive = false;
        ws.ping();
      }
    }, this.#heartbeatInterval);

    logger.info('Heartbeat mechanism started', { 
      interval: this.#heartbeatInterval + 'ms' 
    });
  }

  /**
   * Get client by connection ID
   */
  get clients() {
    return this.#clients;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalConnections: this.#clients.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.#wss) {
      this.#wss.close(() => {
        logger.info('WebSocket server stopped');
      });
    }
  }
}

// Export class
export const createWebSocketServer = () => new NotificationWebSocketServer();
