// ============================================
// src/modules/subscriptions/subscriptions.routes.js
// ============================================
const subscriptionsController = require('./subscriptions.controller')
const subscriptionsValidation = require('./subscriptions.validation')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function subscriptionsRoutes(fastify, options) {
  /**
   * @route GET /subscriptions/plans
   * @desc Get all available subscription plans
   * @access Public
   */
  fastify.get('/plans', {
    schema: {
      description: 'Get all subscription plans',
      tags: ['Subscriptions'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                plans: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, subscriptionsController.getPlans)

  /**
   * @route GET /subscriptions/current
   * @desc Get current subscription for authenticated user's tenant
   * @access Private
   */
  fastify.get('/current', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get current subscription',
      tags: ['Subscriptions'],
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
  }, subscriptionsController.getCurrentSubscription)

  /**
   * @route GET /subscriptions/usage
   * @desc Get usage statistics for tenant
   * @access Private
   */
  fastify.get('/usage', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get usage statistics',
      tags: ['Subscriptions'],
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
  }, subscriptionsController.getUsage)

  /**
   * @route POST /subscriptions/upgrade
   * @desc Upgrade subscription plan
   * @access Private
   */
  fastify.post('/upgrade', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Upgrade subscription plan',
      tags: ['Subscriptions'],
      security: [{ bearerAuth: [] }],
      //body: subscriptionsValidation.upgradePlan.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, subscriptionsController.upgradePlan)

  /**
   * @route GET /subscriptions/limits
   * @desc Check plan limits and usage
   * @access Private
   */
  fastify.get('/limits', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Check plan limits',
      tags: ['Subscriptions'],
      security: [{ bearerAuth: [] }],
      //querystring: subscriptionsValidation.checkLimits.query,
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
  }, subscriptionsController.checkLimits)

  /**
   * @route GET /subscriptions/compare
   * @desc Get plan comparison
   * @access Public
   */
  fastify.get('/compare', {
    schema: {
      description: 'Compare subscription plans',
      tags: ['Subscriptions'],
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
  }, subscriptionsController.getComparison)
}

module.exports = subscriptionsRoutes
