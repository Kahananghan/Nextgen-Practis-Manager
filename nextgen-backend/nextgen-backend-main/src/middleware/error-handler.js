// ============================================
// src/middleware/error-handler.js - Global Error Handler
// ============================================
const logger = require('../utils/logger')
const { AppError } = require('../utils/errors')

/**
 * Global error handler for Fastify
 * Catches all errors and returns standardized error responses
 */
function errorHandler(error, request, reply) {
  // Log the error
  logger.error({
    event: 'ERROR',
    method: request.method,
    url: request.url,
    statusCode: error.statusCode || 500,
    message: error.message,
    stack: error.stack,
    userId: request.user?.userId,
    tenantId: request.user?.tenantId
  })

  // Operational errors (known errors we throw)
  if (error instanceof AppError && error.isOperational) {
    return reply.code(error.statusCode).send({
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode
      }
    })
  }

  // JWT errors
  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    return reply.code(401).send({
      success: false,
      error: {
        name: 'AuthenticationError',
        message: 'Invalid or expired token',
        statusCode: 401
      }
    })
  }

  // Validation errors (from Joi or Fastify)
  if (error.validation || error.statusCode === 400) {
    return reply.code(400).send({
      success: false,
      error: {
        name: 'ValidationError',
        message: error.message || 'Validation failed',
        statusCode: 400,
        details: error.validation
      }
    })
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.code(429).send({
      success: false,
      error: {
        name: 'RateLimitError',
        message: 'Too many requests. Please try again later.',
        statusCode: 429
      }
    })
  }

  // Database errors
  if (error.code && error.code.startsWith('23')) {
    // PostgreSQL constraint violations
    let message = 'Database constraint violation'
    
    if (error.code === '23505') {
      message = 'Resource already exists'
    } else if (error.code === '23503') {
      message = 'Referenced resource not found'
    }

    return reply.code(409).send({
      success: false,
      error: {
        name: 'DatabaseError',
        message,
        statusCode: 409
      }
    })
  }

  // Programming errors (unknown errors)
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  return reply.code(500).send({
    success: false,
    error: {
      name: 'InternalServerError',
      message: isDevelopment 
        ? error.message 
        : 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
      ...(isDevelopment && { stack: error.stack })
    }
  })
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(request, reply) {
  logger.warn({
    event: 'NOT_FOUND',
    method: request.method,
    url: request.url
  })

  return reply.code(404).send({
    success: false,
    error: {
      name: 'NotFoundError',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404
    }
  })
}

module.exports = {
  errorHandler,
  notFoundHandler
}
