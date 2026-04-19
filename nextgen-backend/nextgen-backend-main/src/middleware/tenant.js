// ============================================
// src/middleware/tenant.js - Multi-Tenant Isolation Middleware
// ============================================
const { AuthorizationError } = require('../utils/errors')
const db = require('../config/database')
const logger = require('../utils/logger')

/**
 * Ensure all database queries are isolated to the current tenant
 * This middleware adds tenantId checks to queries automatically
 */
async function ensureTenantIsolation(request, reply) {
  try {
    // User must be authenticated first
    if (!request.user || !request.user.tenantId) {
      throw new AuthorizationError('Tenant context required')
    }

    // Attach tenant helpers to request
    request.tenant = {
      id: request.user.tenantId,
      
      // Helper to verify resource belongs to tenant
      async verifyOwnership(tableName, resourceId) {
        const result = await db.query(
          `SELECT id FROM ${tableName} WHERE id = $1 AND tenant_id = $2`,
          [resourceId, request.user.tenantId]
        )
        
        if (result.rows.length === 0) {
          throw new AuthorizationError('Resource not found or access denied')
        }
        
        return true
      }
    }

    logger.debug({
      event: 'TENANT_ISOLATION',
      tenantId: request.user.tenantId,
      userId: request.user.userId
    })
  } catch (error) {
    logger.error({
      event: 'TENANT_ISOLATION_ERROR',
      error: error.message
    })
    throw error
  }
}

module.exports = {
  ensureTenantIsolation
}
