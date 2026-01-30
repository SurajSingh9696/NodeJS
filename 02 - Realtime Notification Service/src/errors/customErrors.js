/**
 * Custom Error Classes
 * Standardized error types for the notification service
 */

export class NotificationError extends Error {
  constructor(message, code = 'NOTIFICATION_ERROR', statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode
      }
    };
  }
}

export class ValidationError extends NotificationError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details
      }
    };
  }
}

export class AuthenticationError extends NotificationError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends NotificationError {
  constructor(message = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ResourceNotFoundError extends NotificationError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'RESOURCE_NOT_FOUND', 404);
  }
}

export class RateLimitError extends NotificationError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

export class QueueFullError extends NotificationError {
  constructor(message = 'Notification queue is full') {
    super(message, 'QUEUE_FULL_ERROR', 503);
  }
}

export class ConnectionError extends NotificationError {
  constructor(message = 'Connection error') {
    super(message, 'CONNECTION_ERROR', 503);
  }
}
