/**
 * Logger System
 * Centralized logging with multiple levels and output options
 */

import { config } from '../config/config.js';
import fs from 'fs';
import path from 'path';

export class Logger {
  static #instance = null;
  #levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  constructor() {
    if (Logger.#instance) {
      return Logger.#instance;
    }

    this.currentLevel = this.#levels[config.get('logging.level')] || this.#levels.info;
    this.enableConsole = config.get('logging.enableConsole');
    this.enableFile = config.get('logging.enableFile');
    this.logPath = config.get('logging.logPath');

    if (this.enableFile) {
      this.#ensureLogDirectory();
    }

    Logger.#instance = this;
  }

  #ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
      this.enableFile = false;
    }
  }

  #formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  #writeToFile(level, formattedMessage) {
    if (!this.enableFile) return;

    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = path.join(this.logPath, `${date}.log`);
      fs.appendFileSync(filename, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  #log(level, message, meta = {}) {
    if (this.#levels[level] > this.currentLevel) {
      return;
    }

    const formattedMessage = this.#formatMessage(level, message, meta);

    if (this.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](formattedMessage);
    }

    this.#writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    this.#log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.#log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.#log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.#log('debug', message, meta);
  }
}

// Export singleton instance
export const logger = new Logger();
