// ============================================
// src/utils/errors.js - Custom Error Classes
// ============================================

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

class XeroApiError extends AppError {
  constructor(message = 'Xero API error', originalError = null) {
    super(message, 502)
    this.name = 'XeroApiError'
    this.originalError = originalError
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500)
    this.name = 'DatabaseError'
    this.originalError = originalError
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429)
    this.name = 'RateLimitError'
  }
}

class SubscriptionError extends AppError {
  constructor(message = 'Subscription limit exceeded') {
    super(message, 402)
    this.name = 'SubscriptionError'
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  XeroApiError,
  DatabaseError,
  RateLimitError,
  SubscriptionError
}
