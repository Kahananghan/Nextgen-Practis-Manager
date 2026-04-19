// ============================================
// src/middleware/index.js - Middleware Exports
// ============================================

const { authenticate, optionalAuth } = require('./auth')
const { ensureTenantIsolation } = require('./tenant')
const { requirePermission, requireRole, clearUserPermissionCache } = require('./rbac')
const { requireFeature, checkLimit, clearSubscriptionCache } = require('./plan-guard')
const { errorHandler, notFoundHandler } = require('./error-handler')

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,

  // Tenant Isolation
  ensureTenantIsolation,

  // RBAC
  requirePermission,
  requireRole,
  clearUserPermissionCache,

  // Subscription
  requireFeature,
  checkLimit,
  clearSubscriptionCache,

  // Error Handling
  errorHandler,
  notFoundHandler
}
