// ============================================
// src/modules/integrations/xero/xero.routes.js
// ============================================
const xeroController = require('./xero.controller')
const { authenticate } = require('../../../middleware/auth')
const { ensureTenantIsolation } = require('../../../middleware/tenant')

async function xeroRoutes(fastify, options) {
  /**
   * @route GET /integrations/xero/connect
   * @desc Initiate Xero OAuth connection
   * @access Private
   */
  fastify.get('/xero/connect', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Initiate Xero OAuth connection',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                consentUrl: { type: 'string' },
                state: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, xeroController.connect)

  /**
   * @route GET /integrations/xero/callback
   * @desc Handle Xero OAuth callback
   * @access Public (OAuth callback)
   */
  fastify.get('/xero/callback', {
    schema: {
      description: 'Handle Xero OAuth callback',
      tags: ['Integrations'],
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          scope: { type: 'string' }
        }
      }
    }
  }, xeroController.callback)

  /**
   * @route POST /integrations/xero/disconnect
   * @desc Disconnect Xero integration
   * @access Private
   */
  fastify.post('/xero/disconnect', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Disconnect Xero integration',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, xeroController.disconnect)

  /**
   * @route GET /integrations/xero/status
   * @desc Get Xero connection status
   * @access Private
   */
  fastify.get('/xero/status', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get Xero connection status',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
             }
          }
        }
      }
    }
  }, xeroController.getStatus)

  /**
   * @route GET /integrations
   * @desc Get all integrations for tenant
   * @access Private
   */
  fastify.get('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all integrations',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                integrations: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, xeroController.getIntegrations)
}

module.exports = xeroRoutes
