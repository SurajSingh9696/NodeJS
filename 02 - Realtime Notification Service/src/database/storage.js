/**
 * Database Storage Layer
 * Persistent storage for users, API keys, and sessions
 */

import fs from 'fs';
import path from 'path';
import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

export class Database {
  static #instance = null;
  #dbPath;
  #usersFile;
  #apiKeysFile;
  #sessionsFile;
  #data = { users: {}, apiKeys: {}, sessions: {} };
  #autoSave;
  #saveInterval;
  #saveTimer = null;
  #isDirty = false;

  constructor() {
    if (Database.#instance) return Database.#instance;
    this.#dbPath = config.get('database.path');
    this.#usersFile = path.join(this.#dbPath, 'users.json');
    this.#apiKeysFile = path.join(this.#dbPath, 'apiKeys.json');
    this.#sessionsFile = path.join(this.#dbPath, 'sessions.json');
    this.#autoSave = config.get('database.autoSave');
    this.#saveInterval = config.get('database.saveInterval');
    this.#initialize();
    Database.#instance = this;
  }

  #initialize() {
    try {
      if (!fs.existsSync(this.#dbPath)) {
        fs.mkdirSync(this.#dbPath, { recursive: true });
      }
      this.#loadData();
      if (this.#autoSave) this.#startAutoSave();
      logger.info('Database initialized', {
        users: Object.keys(this.#data.users).length,
        apiKeys: Object.keys(this.#data.apiKeys).length
      });
    } catch (error) {
      logger.error('Database init failed', { error: error.message });
    }
  }

  #loadData() {
    try {
      if (fs.existsSync(this.#usersFile)) {
        this.#data.users = JSON.parse(fs.readFileSync(this.#usersFile, 'utf8'));
      }
    } catch { this.#data.users = {}; }

    try {
      if (fs.existsSync(this.#apiKeysFile)) {
        const parsed = JSON.parse(fs.readFileSync(this.#apiKeysFile, 'utf8'));
        for (const [key, value] of Object.entries(parsed)) {
          this.#data.apiKeys[key] = {
            ...value,
            createdAt: new Date(value.createdAt),
            connections: new Set(),
            stats: { ...value.stats, lastActivity: new Date(value.stats?.lastActivity || Date.now()) }
          };
        }
      }
    } catch { this.#data.apiKeys = {}; }

    try {
      if (fs.existsSync(this.#sessionsFile)) {
        this.#data.sessions = JSON.parse(fs.readFileSync(this.#sessionsFile, 'utf8'));
      }
    } catch { this.#data.sessions = {}; }
  }

  #saveData() {
    try {
      fs.writeFileSync(this.#usersFile, JSON.stringify(this.#data.users, null, 2));
      
      const apiKeysSerializable = {};
      for (const [key, value] of Object.entries(this.#data.apiKeys)) {
        apiKeysSerializable[key] = {
          name: value.name,
          userId: value.userId,
          createdAt: value.createdAt?.toISOString() || new Date().toISOString(),
          stats: {
            totalConnections: value.stats?.totalConnections || 0,
            totalNotifications: value.stats?.totalNotifications || 0,
            lastActivity: value.stats?.lastActivity?.toISOString() || new Date().toISOString()
          }
        };
      }
      fs.writeFileSync(this.#apiKeysFile, JSON.stringify(apiKeysSerializable, null, 2));
      fs.writeFileSync(this.#sessionsFile, JSON.stringify(this.#data.sessions, null, 2));
      this.#isDirty = false;
    } catch (error) {
      logger.error('Failed to save database', { error: error.message });
    }
  }

  #startAutoSave() {
    this.#saveTimer = setInterval(() => {
      if (this.#isDirty) this.#saveData();
    }, this.#saveInterval);
  }

  #markDirty() { this.#isDirty = true; }

  #hashPassword(password, salt) {
    return createHash('sha256').update(password + salt).digest('hex');
  }

  // ==================== User Methods ====================
  
  createUser(email, password, name) {
    const emailLower = email.toLowerCase();
    if (this.#data.users[emailLower]) {
      return { success: false, error: 'Email already registered' };
    }
    const salt = randomBytes(16).toString('hex');
    const userId = randomBytes(16).toString('hex');
    this.#data.users[emailLower] = {
      id: userId, email: emailLower, name,
      password: this.#hashPassword(password, salt),
      salt, createdAt: new Date().toISOString()
    };
    this.#markDirty();
    if (!this.#autoSave) this.#saveData();
    return { success: true, userId };
  }

  validateUser(email, password) {
    const user = this.#data.users[email.toLowerCase()];
    if (!user) return { success: false, error: 'Invalid email or password' };
    if (this.#hashPassword(password, user.salt) !== user.password) {
      return { success: false, error: 'Invalid email or password' };
    }
    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
  }

  getUser(userId) {
    for (const user of Object.values(this.#data.users)) {
      if (user.id === userId) return { id: user.id, email: user.email, name: user.name };
    }
    return null;
  }

  // ==================== Session Methods ====================
  
  createSession(userId) {
    const token = randomBytes(32).toString('hex');
    this.#data.sessions[token] = { userId, createdAt: Date.now(), expiresAt: Date.now() + 86400000 * 7 };
    this.#markDirty();
    return token;
  }

  validateSession(token) {
    const session = this.#data.sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete this.#data.sessions[token];
      this.#markDirty();
      return null;
    }
    return this.getUser(session.userId);
  }

  deleteSession(token) {
    delete this.#data.sessions[token];
    this.#markDirty();
  }

  // ==================== API Key Methods ====================
  
  saveApiKey(apiKey, data) {
    this.#data.apiKeys[apiKey] = { ...data, connections: new Set() };
    this.#markDirty();
    if (!this.#autoSave) this.#saveData();
  }

  getApiKey(apiKey) { return this.#data.apiKeys[apiKey]; }
  getAllApiKeys() { return { ...this.#data.apiKeys }; }

  getApiKeysByUser(userId) {
    const keys = [];
    for (const [apiKey, data] of Object.entries(this.#data.apiKeys)) {
      if (data.userId === userId) keys.push({ apiKey, ...data });
    }
    return keys;
  }

  deleteApiKey(apiKey) {
    delete this.#data.apiKeys[apiKey];
    this.#markDirty();
    if (!this.#autoSave) this.#saveData();
  }

  updateApiKeyStats(apiKey, stats) {
    if (this.#data.apiKeys[apiKey]) {
      this.#data.apiKeys[apiKey].stats = { ...this.#data.apiKeys[apiKey].stats, ...stats };
      this.#markDirty();
    }
  }

  hasApiKey(apiKey) { return apiKey in this.#data.apiKeys; }
  save() { this.#saveData(); }

  async close() {
    if (this.#saveTimer) clearInterval(this.#saveTimer);
    if (this.#isDirty) this.#saveData();
    logger.info('Database closed');
  }
}

export const database = new Database();
