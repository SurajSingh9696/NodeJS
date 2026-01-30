/**
 * Error Handler
 * Centralized error handling and response formatting
 */

import { logger } from '../utils/logger.js';
import { NotificationError } from './customErrors.js';

export class ErrorHandler {
  /**
   * Handle errors in HTTP context
   */
  static handleHTTPError(error, req, res) {
    logger.error(`HTTP Error: ${error.message}`, {
      path: req?.url,
      method: req?.method,
      stack: error.stack
    });

    if (error instanceof NotificationError) {
      res.writeHead(error.statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(error.toJSON()));
      return;
    }

    // Default to 500 for unknown errors
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: {
        name: 'InternalServerError',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500
      }
    }));
  }

  /**
   * Handle errors in WebSocket context
   */
  static handleWebSocketError(error, ws, context = {}) {
    logger.error(`WebSocket Error: ${error.message}`, {
      clientId: context.clientId,
      apiKey: context.apiKey,
      stack: error.stack
    });

    if (ws && ws.readyState === ws.OPEN) {
      const errorMessage = error instanceof NotificationError 
        ? error.toJSON() 
        : {
            error: {
              name: 'WebSocketError',
              message: error.message || 'WebSocket error occurred',
              code: 'WEBSOCKET_ERROR'
            }
          };

      try {
        ws.send(JSON.stringify(errorMessage));
      } catch (sendError) {
        logger.error('Failed to send error message to client', {
          error: sendError.message
        });
      }
    }
  }

  /**
   * Handle async errors
   */
  static async handleAsyncError(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      logger.error(`Async Error: ${error.message}`, {
        context,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        logger.error(`Wrapped Async Error: ${error.message}`, {
          stack: error.stack
        });
        throw error;
      }
    };
  }
}
