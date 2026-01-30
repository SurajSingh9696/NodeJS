const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
  }

  #log(level, message, meta = {}) {
    if (LOG_LEVELS[level] >= this.level) {
      const timestamp = new Date().toISOString();
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
    }
  }

  debug(message, meta) {
    this.#log('debug', message, meta);
  }

  info(message, meta) {
    this.#log('info', message, meta);
  }

  warn(message, meta) {
    this.#log('warn', message, meta);
  }

  error(message, meta) {
    this.#log('error', message, meta);
  }
}

export const logger = new Logger();
