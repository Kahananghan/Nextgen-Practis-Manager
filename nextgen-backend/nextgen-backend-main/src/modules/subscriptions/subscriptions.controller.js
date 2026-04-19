// ============================================
// src/modules/subscriptions/subscriptions.controller.js
// ============================================
const subscriptionsService = require('./subscriptions.service')
const logger = require('../../utils/logger')

class SubscriptionsController {
  /**
   * Get all subscription plans
   * GET /subscriptions/plans
   */
  async getPlans(request, reply) {
    try {
      const plans = await subscriptionsService.getPlans()

      return reply.send({
        success: true,
        data: {
          plans
        }
      })
    } catch (error) {
      logger.error({
        event: 'GET_PLANS_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch subscription plans',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get current subscription for tenant
   * GET /subscriptions/current
   */
  async getCurrentSubscription(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const subscription = await subscriptionsService.getCurrentSubscription(tenantId)

      return reply.send({
        success: true,
        data: subscription
      })
    } catch (error) {
      logger.error({
        event: 'GET_CURRENT_SUBSCRIPTION_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message || 'Failed to fetch subscription',
          statusCode
        }
      })
    }
  }

  /**
   * Get usage statistics
   * GET /subscriptions/usage
   */
  async getUsage(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const usage = await subscriptionsService.getUsageStats(tenantId)

      return reply.send({
        success: true,
        data: usage
      })
    } catch (error) {
      logger.error({
        event: 'GET_USAGE_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch usage statistics',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Upgrade subscription plan
   * POST /subscriptions/upgrade
   */
  async upgradePlan(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { planTier } = request.body

      const subscription = await subscriptionsService.upgradePlan(tenantId, planTier)

      return reply.send({
        success: true,
        data: subscription,
        message: `Successfully upgraded to ${planTier} plan`
      })
    } catch (error) {
      logger.error({
        event: 'UPGRADE_PLAN_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        planTier: request.body.planTier,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message || 'Failed to upgrade plan',
          statusCode
        }
      })
    }
  }

  /**
   * Check plan limits
   * GET /subscriptions/limits
   */
  async checkLimits(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { type } = request.query

      const limits = await subscriptionsService.checkLimits(tenantId, type)

      return reply.send({
        success: true,
        data: limits
      })
    } catch (error) {
      logger.error({
        event: 'CHECK_LIMITS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message || 'Failed to check limits',
          statusCode
        }
      })
    }
  }

  /**
   * Get plan comparison
   * GET /subscriptions/compare
   */
  async getComparison(request, reply) {
    try {
      const comparison = await subscriptionsService.getComparison()

      return reply.send({
        success: true,
        data: comparison
      })
    } catch (error) {
      logger.error({
        event: 'GET_COMPARISON_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch plan comparison',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new SubscriptionsController()
