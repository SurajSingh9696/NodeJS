/**
 * REST API Server
 * HTTP API with user authentication and static file serving
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL, fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { database } from '../database/storage.js';
import { clientManager } from '../services/clientManager.js';
import { notificationService } from '../services/notificationService.js';
import { notificationQueue } from '../services/notificationQueue.js';
import { ErrorHandler } from '../errors/errorHandler.js';
import { AuthenticationError, ValidationError } from '../errors/customErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export class RestAPIServer {
  #server = null;

  start(port) {
    this.#server = http.createServer(async (req, res) => {
      try {
        this.#setCORS(res);
        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Serve static files
        if (!pathname.startsWith('/api/')) {
          return this.#serveStatic(req, res, pathname);
        }

        // API routes
        await this.#handleAPI(req, res, url);
      } catch (error) {
        ErrorHandler.handleHTTPError(error, req, res);
      }
    });

    this.#server.listen(port, () => logger.info('Server started', { port }));
    return this.#server;
  }

  async #serveStatic(req, res, pathname) {
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    try {
      if (!fs.existsSync(filePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      }
      
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  async #handleAPI(req, res, url) {
    const method = req.method;
    const pathname = url.pathname;
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await this.#parseBody(req) : {};
    const send = (data, code = 200) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Auth routes (no session required)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password, name } = body;
      if (!email || !password || !name) throw new ValidationError('Email, password, and name required');
      const result = database.createUser(email, password, name);
      if (!result.success) throw new ValidationError(result.error);
      const token = database.createSession(result.userId);
      return send({ success: true, token, message: 'Registration successful' }, 201);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) throw new ValidationError('Email and password required');
      const result = database.validateUser(email, password);
      if (!result.success) throw new AuthenticationError(result.error);
      const token = database.createSession(result.user.id);
      return send({ success: true, token, user: result.user });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const token = this.#getToken(req);
      if (token) database.deleteSession(token);
      return send({ success: true });
    }

    if (pathname === '/api/health' && method === 'GET') {
      return send({ status: 'healthy', uptime: process.uptime() });
    }

    // Protected routes - require session
    const token = this.#getToken(req);
    const user = token ? database.validateSession(token) : null;
    
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!user) throw new AuthenticationError('Not authenticated');
      return send({ success: true, user });
    }

    // API Key routes (require user session)
    if (pathname === '/api/keys' && method === 'GET') {
      if (!user) throw new AuthenticationError('Not authenticated');
      const keys = database.getApiKeysByUser(user.id);
      return send({ success: true, keys });
    }

    if (pathname === '/api/keys' && method === 'POST') {
      if (!user) throw new AuthenticationError('Not authenticated');
      const { name } = body;
      if (!name) throw new ValidationError('Name is required');
      const apiKey = clientManager.generateApiKey(name, user.id);
      return send({ success: true, apiKey, name }, 201);
    }

    if (pathname.startsWith('/api/keys/') && method === 'DELETE') {
      if (!user) throw new AuthenticationError('Not authenticated');
      const apiKey = pathname.split('/')[3];
      const keyData = database.getApiKey(apiKey);
      if (!keyData || keyData.userId !== user.id) throw new AuthenticationError('Not authorized');
      clientManager.revokeApiKey(apiKey);
      return send({ success: true });
    }

    // Notification routes (require API key)
    if (pathname === '/api/notifications' && method === 'POST') {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) throw new AuthenticationError('API key required');
      const { channel, data, priority } = body;
      const result = await notificationService.sendNotification({ channel, data, priority, apiKey });
      return send({ success: true, ...result }, 201);
    }

    // Stats
    if (pathname === '/api/stats' && method === 'GET') {
      if (!user) throw new AuthenticationError('Not authenticated');
      const keys = database.getApiKeysByUser(user.id);
      const totalNotifications = keys.reduce((sum, k) => sum + (k.stats?.totalNotifications || 0), 0);
      return send({ success: true, apiKeys: keys.length, totalNotifications, queue: notificationQueue.getStats() });
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  async #parseBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch { reject(new ValidationError('Invalid JSON')); }
      });
      req.on('error', reject);
    });
  }

  #setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }

  #getToken(req) {
    return req.headers['authorization']?.replace('Bearer ', '');
  }

  stop() {
    if (this.#server) this.#server.close();
  }
}

export const createRestAPIServer = () => new RestAPIServer();
