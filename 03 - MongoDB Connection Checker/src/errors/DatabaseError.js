export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    
    if (originalError) {
      this.code = originalError.code;
      this.codeName = originalError.codeName;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}
