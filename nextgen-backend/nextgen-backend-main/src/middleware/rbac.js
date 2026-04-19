// ============================================
// src/middleware/rbac.js - Role-Based Access Control Middleware
// ============================================
const { AuthorizationError } = require('../utils/errors')
const db = require('../config/database')
const logger = require('../utils/logger')
const redis = require('../config/redis')

/**
 * Check if user has specific permission
 * @param {string} resource - Resource name (e.g., 'jobs', 'users')
 * @param {string} action - Action name (e.g., 'create', 'view', 'edit', 'delete')
 */
function requirePermission(resource, action) {
  return async (request, reply) => {
    try {
      const userId = request.user.userId
      const cacheKey = `permissions:${userId}:${resource}:${action}`

      // Check cache first
      const cached = await redis.get(cacheKey)
      if (cached !== null) {
        if (!cached) {
          throw new AuthorizationError(`Insufficient permissions: ${resource}.${action}`)
        }
        return // Permission granted from cache
      }

      // Check database
      const hasPermission = await checkUserPermission(userId, resource, action)

      // Cache result for 5 minutes
      await redis.set(cacheKey, hasPermission, 300)

      if (!hasPermission) {
        logger.warn({
          event: 'PERMISSION_DENIED',
          userId,
          resource,
          action
        })
        throw new AuthorizationError(`Insufficient permissions: ${resource}.${action}`)
      }

      logger.debug({
        event: 'PERMISSION_GRANTED',
        userId,
        resource,
        action
      })
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error
      }
      logger.error({
        event: 'RBAC_ERROR',
        error: error.message
      })
      throw new AuthorizationError('Permission check failed')
    }
  }
}

/**
 * Check if user has permission in database
 */
async function checkUserPermission(userId, resource, action) {
  // Check for Full Access override
  const fullAccessQuery = `
    SELECT EXISTS(
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
      AND p.resource = 'full_access'
      AND up.is_active = true
    ) as has_full_access
  `
  
  const fullAccessResult = await db.query(fullAccessQuery, [userId])
  
  if (fullAccessResult.rows[0].has_full_access) {
    return true
  }

  // Check specific permission
  const permissionQuery = `
    SELECT EXISTS(
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
      AND p.resource = $2
      AND p.action = $3
      AND up.is_active = true
    ) as has_permission
  `

  const result = await db.query(permissionQuery, [userId, resource, action])
  return result.rows[0].has_permission
}

/**
 * Require any of the specified roles
 * @param {string[]} roles - Array of role names
 */
function requireRole(...roles) {
  return async (request, reply) => {
    try {
      const userId = request.user.userId
      const cacheKey = `user-roles:${userId}`

      // Check cache first
      let userRoles = await redis.get(cacheKey)

      if (!userRoles) {
        // Fetch from database
        const result = await db.query(`
          SELECT r.name 
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = $1
        `, [userId])

        userRoles = result.rows.map(row => row.name)
        
        // Cache for 5 minutes
        await redis.set(cacheKey, userRoles, 300)
      }

      const hasRole = roles.some(role => userRoles.includes(role))

      if (!hasRole) {
        logger.warn({
          event: 'ROLE_DENIED',
          userId,
          requiredRoles: roles,
          userRoles
        })
        throw new AuthorizationError(`Required role: ${roles.join(' or ')}`)
      }

      logger.debug({
        event: 'ROLE_GRANTED',
        userId,
        role: roles
      })
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error
      }
      logger.error({
        event: 'ROLE_CHECK_ERROR',
        error: error.message
      })
      throw new AuthorizationError('Role check failed')
    }
  }
}

/**
 * Clear permission cache for a user (call after updating permissions)
 */
async function clearUserPermissionCache(userId) {
  const pattern = `permissions:${userId}:*`
  // Note: In production, use Redis SCAN for large datasets
  await redis.delete(`user-roles:${userId}`)
  logger.info({
    event: 'PERMISSION_CACHE_CLEARED',
    userId
  })
}

module.exports = {
  requirePermission,
  requireRole,
  clearUserPermissionCache
}
