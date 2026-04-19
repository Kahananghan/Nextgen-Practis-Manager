// ============================================
// src/modules/sync/sync.routes.js
// ============================================
const syncController = require('./sync.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function syncRoutes(fastify, options) {
  /**
   * @route POST /sync/full
   * @desc Trigger full sync of all XPM data
   * @access Private
   */
  fastify.post('/full', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Trigger full sync from Xero Practice Manager',
      tags: ['Sync'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                jobId: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, syncController.triggerFullSync)

  /**
   * @route POST /sync/delta
   * @desc Trigger delta sync (modified data only)
   * @access Private
   */
  fastify.post('/delta', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Trigger delta sync (incremental)',
      tags: ['Sync'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                jobId: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, syncController.triggerDeltaSync)

  /**
   * @route GET /sync/status
   * @desc Get sync status and history
   * @access Private
   */
  fastify.get('/status', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get sync status and history',
      tags: ['Sync'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                history: { type: 'array' },
                xero: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean' },
                    status: { type: 'string' },
                    lastSyncAt: { type: 'string' },
                    errorMessage: { type: 'string' },
                    lastUpdated: { type: 'string' }
                  }
                },
                stats: { additionalProperties: true }
              }
            }
          }
        }
      }
    }
  }, syncController.getSyncStatus)

  /**
   * @route GET /sync/stats
   * @desc Get sync statistics
   * @access Private
   */
  fastify.get('/stats', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get sync statistics',
      tags: ['Sync'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, syncController.getSyncStats)
}

module.exports = syncRoutes
