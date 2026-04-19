// ============================================
// src/middleware/auth.js - JWT Authentication Middleware
// ============================================
const { AuthenticationError } = require('../utils/errors')
const logger = require('../utils/logger')

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
    
    // User payload is now available in request.user
    // Expected payload: { userId, tenantId, email, role }
    if (!request.user || !request.user.userId || !request.user.tenantId) {
      throw new AuthenticationError('Invalid token payload')
    }

    logger.debug({
      event: 'AUTH_SUCCESS',
      userId: request.user.userId,
      tenantId: request.user.tenantId
    })
  } catch (error) {
    logger.warn({
      event: 'AUTH_FAILURE',
      error: error.message,
      path: request.url
    })
    throw new AuthenticationError('Invalid or expired token')
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch (error) {
    // Silently ignore - user is not authenticated but that's OK
    request.user = null
  }
}

module.exports = {
  authenticate,
  optionalAuth
}
