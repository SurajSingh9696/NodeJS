/**
 * Main Server
 * Entry point for the Realtime Notification Service
 */

import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { database } from './database/storage.js';
import { createWebSocketServer } from './websocket/wsServer.js';
import { createRestAPIServer } from './api/restServer.js';
import { notificationService } from './services/notificationService.js';

class NotificationServiceApp {
  #wsServer = null;
  #apiServer = null;

  /**
   * Initialize and start the service
   */
  async start() {
    try {
      // Validate configuration
      config.validate();
      logger.info('Configuration validated successfully');

      // Display startup banner
      this.#displayBanner();

      // Start WebSocket server
      this.#wsServer = createWebSocketServer();
      this.#wsServer.start(config.get('server.wsPort'));

      // Set WebSocket server reference in notification service
      notificationService.setWebSocketServer(this.#wsServer);

      // Start REST API server
      this.#apiServer = createRestAPIServer();
      this.#apiServer.start(config.get('server.port'));

      logger.info('All services started successfully');
      this.#displayServiceInfo();

      // Setup graceful shutdown
      this.#setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start service', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }

  /**
   * Display startup banner
   */
  #displayBanner() {
    const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Realtime Notification Service Platform               ║
║     Version 1.0.0                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `;
    console.log(banner);
  }

  /**
   * Display service information
   */
  #displayServiceInfo() {
    const port = config.get('server.port');
    const wsPort = config.get('server.wsPort');
    const info = `
Service Information:
--------------------
Dashboard:           http://localhost:${port}
REST API:            http://localhost:${port}/api
WebSocket:           ws://localhost:${wsPort}

Auth Endpoints:
  POST /api/auth/register  - Create account
  POST /api/auth/login     - Login
  POST /api/auth/logout    - Logout
  GET  /api/auth/me        - Get current user

API Key Endpoints:
  GET    /api/keys         - List your API keys
  POST   /api/keys         - Create new API key
  DELETE /api/keys/:key    - Delete API key

Notification Endpoints:
  POST /api/notifications  - Send notification

Ready! Open http://localhost:${port} in your browser.
    `;
    console.log(info);
  }

  /**
   * Setup graceful shutdown handlers
   */
  #setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Stop accepting new connections
      if (this.#apiServer) {
        this.#apiServer.stop();
      }

      if (this.#wsServer) {
        this.#wsServer.stop();
      }
      
      // Close database and save data
      try {
        await database.close();
        logger.info('Database saved and closed');
      } catch (error) {
        logger.error('Error closing database', { error: error.message });
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }
}

// Start the application
const app = new NotificationServiceApp();
app.start();
