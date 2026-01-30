import { logger } from './utils/logger.js';

export class MongoHealthChecker {
  #connection;
  #dbName;
  #healthCheckInterval = 30000;
  #healthCheckTimer = null;
  #lastHealthCheck = null;
  #healthStatus = {
    isHealthy: false,
    lastCheck: null,
    responseTime: null,
    serverInfo: null,
    replicaSetStatus: null,
    errors: []
  };

  constructor(connection, dbName, healthCheckInterval = 30000) {
    this.#connection = connection;
    this.#dbName = dbName;
    this.#healthCheckInterval = healthCheckInterval;
  }

  startHealthChecks() {
    if (this.#healthCheckTimer) {
      logger.warn('Health checks already running');
      return;
    }

    logger.info('Starting MongoDB health checks', {
      interval: this.#healthCheckInterval
    });

    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', { error: error.message });
    });

    this.#healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Periodic health check failed', { error: error.message });
      });
    }, this.#healthCheckInterval);
  }

  stopHealthChecks() {
    if (this.#healthCheckTimer) {
      clearInterval(this.#healthCheckTimer);
      this.#healthCheckTimer = null;
      logger.info('Stopped MongoDB health checks');
    }
  }

  async performHealthCheck() {
    const startTime = Date.now();
    const errors = [];
    let isHealthy = true;

    try {
      const connectionStatus = await this.#checkConnectionStatus();
      if (!connectionStatus.success) {
        isHealthy = false;
        errors.push(connectionStatus.error);
      }

      const pingStatus = await this.#checkPing();
      if (!pingStatus.success) {
        isHealthy = false;
        errors.push(pingStatus.error);
      }

      const serverInfo = await this.#getServerInfo();
      const dbStats = await this.#getDatabaseStats();
      const replicaSetStatus = await this.#getReplicaSetStatus();

      const responseTime = Date.now() - startTime;

      this.#healthStatus = {
        isHealthy,
        lastCheck: new Date(),
        responseTime,
        serverInfo: serverInfo.data,
        databaseStats: dbStats.data,
        replicaSetStatus: replicaSetStatus.data,
        errors: errors.length > 0 ? errors : null
      };

      if (isHealthy) {
        logger.debug('MongoDB health check passed', {
          responseTime,
          version: serverInfo.data?.version
        });
      } else {
        logger.error('MongoDB health check failed', {
          errors,
          responseTime
        });
      }

      return this.#healthStatus;
    } catch (error) {
      this.#healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        serverInfo: null,
        replicaSetStatus: null,
        errors: [error.message]
      };

      logger.error('Health check exception', { error: error.message });
      return this.#healthStatus;
    }
  }

  async #checkConnectionStatus() {
    try {
      if (this.#connection.readyState !== 1) {
        return {
          success: false,
          error: 'Mongoose not connected'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Connection check failed: ${error.message}`
      };
    }
  }

  async #checkPing() {
    try {
      const result = await this.#connection.db.admin().ping();
      
      if (result.ok === 1) {
        return { success: true };
      }
      
      return {
        success: false,
        error: 'Ping returned non-OK status'
      };
    } catch (error) {
      return {
        success: false,
        error: `Ping failed: ${error.message}`
      };
    }
  }

  async #getServerInfo() {
    try {
      const serverInfo = await this.#connection.db.admin().serverInfo();
      
      return {
        success: true,
        data: {
          version: serverInfo.version,
          platform: serverInfo.platform,
          uptime: serverInfo.uptime,
          maxBsonObjectSize: serverInfo.maxBsonObjectSize
        }
      };
    } catch (error) {
      logger.warn('Failed to get server info', { error: error.message });
      return {
        success: false,
        data: null
      };
    }
  }

  async #getDatabaseStats() {
    try {
      const stats = await this.#connection.db.stats();
      
      return {
        success: true,
        data: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize,
          storageSize: stats.storageSize,
          objects: stats.objects
        }
      };
    } catch (error) {
      logger.warn('Failed to get database stats', { error: error.message });
      return {
        success: false,
        data: null
      };
    }
  }

  async #getReplicaSetStatus() {
    try {
      const status = await this.#connection.db.admin().replSetGetStatus();
      
      return {
        success: true,
        data: {
          setName: status.set,
          members: status.members.length,
          primary: status.members.find(m => m.stateStr === 'PRIMARY')?.name,
          myState: status.myState
        }
      };
    } catch (error) {
      if (error.codeName === 'NoReplicationEnabled') {
        return {
          success: true,
          data: { mode: 'standalone' }
        };
      }
      
      return {
        success: false,
        data: null
      };
    }
  }

  getHealthStatus() {
    return { ...this.#healthStatus };
  }

  isHealthy() {
    return this.#healthStatus.isHealthy;
  }

  getHealthSummary() {
    return {
      status: this.#healthStatus.isHealthy ? 'healthy' : 'unhealthy',
      lastCheck: this.#healthStatus.lastCheck,
      responseTime: this.#healthStatus.responseTime,
      version: this.#healthStatus.serverInfo?.version,
      uptime: this.#healthStatus.serverInfo?.uptime,
      errors: this.#healthStatus.errors
    };
  }
}
