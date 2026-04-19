// ============================================
// src/modules/subscriptions/subscriptions.service.js
// ============================================
const db = require('../../config/database')
const redis = require('../../config/redis')
const logger = require('../../utils/logger')
const { 
  NotFoundError, 
  SubscriptionError,
  ValidationError 
} = require('../../utils/errors')

class SubscriptionsService {
  /**
   * Get all available subscription plans
   * @returns {Array} - List of subscription plans
   */
  async getPlans() {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          tier,
          price_monthly,
          price_yearly,
          max_users,
          max_jobs_per_month,
          features,
          is_active
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY 
          CASE tier
            WHEN 'starter' THEN 1
            WHEN 'pro' THEN 2
            WHEN 'enterprise' THEN 3
          END
      `)

      return result.rows
    } catch (error) {
      logger.error({
        event: 'GET_PLANS_ERROR',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get current subscription for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Current subscription with usage stats
   */
  async getCurrentSubscription(tenantId) {
    try {
      // Get active subscription
      const subResult = await db.query(`
        SELECT 
          ts.id as subscription_id,
          ts.status,
          ts.started_at,
          ts.expires_at,
          ts.auto_renew,
          sp.id as plan_id,
          sp.name as plan_name,
          sp.tier,
          sp.price_monthly,
          sp.price_yearly,
          sp.max_users,
          sp.max_jobs_per_month,
          sp.features
        FROM tenant_subscriptions ts
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.tenant_id = $1
          AND ts.status = 'active'
          AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
        ORDER BY ts.started_at DESC
        LIMIT 1
      `, [tenantId])

      if (subResult.rows.length === 0) {
        throw new NotFoundError('No active subscription found')
      }

      const subscription = subResult.rows[0]

      // Get usage stats
      const usage = await this.getUsageStats(tenantId)

      return {
        subscription: {
          id: subscription.subscription_id,
          status: subscription.status,
          startedAt: subscription.started_at,
          expiresAt: subscription.expires_at,
          autoRenew: subscription.auto_renew
        },
        plan: {
          id: subscription.plan_id,
          name: subscription.plan_name,
          tier: subscription.tier,
          priceMonthly: subscription.price_monthly,
          priceYearly: subscription.price_yearly,
          limits: {
            maxUsers: subscription.max_users,
            maxJobsPerMonth: subscription.max_jobs_per_month
          },
          features: subscription.features
        },
        usage
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      logger.error({
        event: 'GET_CURRENT_SUBSCRIPTION_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get usage statistics for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Usage stats
   */
  async getUsageStats(tenantId) {
    try {
      // Get user count
      const usersResult = await db.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE tenant_id = $1 AND status = 'active'
      `, [tenantId])

      const userCount = parseInt(usersResult.rows[0].count)

      // Get jobs this month
      const jobsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_jobs
        WHERE tenant_id = $1
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `, [tenantId])

      const jobsThisMonth = parseInt(jobsResult.rows[0].count)

      // Get total jobs
      const totalJobsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_jobs
        WHERE tenant_id = $1
      `, [tenantId])

      const totalJobs = parseInt(totalJobsResult.rows[0].count)

      return {
        users: {
          current: userCount
        },
        jobs: {
          thisMonth: jobsThisMonth,
          total: totalJobs
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_USAGE_STATS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Upgrade subscription to a new plan
   * @param {string} tenantId - Tenant ID
   * @param {string} planTier - New plan tier (starter, pro, enterprise)
   * @returns {object} - Updated subscription
   */
  async upgradePlan(tenantId, planTier) {
    try {
      // Validate plan tier
      if (!['starter', 'pro', 'enterprise'].includes(planTier)) {
        throw new ValidationError('Invalid plan tier')
      }

      // Get current subscription
      const currentSub = await this.getCurrentSubscription(tenantId)

      // Check if already on this plan
      if (currentSub.plan.tier === planTier) {
        throw new SubscriptionError(`Already subscribed to ${planTier} plan`)
      }

      // Get new plan details
      const planResult = await db.query(`
        SELECT id, tier, name, max_users, max_jobs_per_month
        FROM subscription_plans
        WHERE tier = $1 AND is_active = true
      `, [planTier])

      if (planResult.rows.length === 0) {
        throw new NotFoundError(`Plan '${planTier}' not found`)
      }

      const newPlan = planResult.rows[0]

      // Check if this is an upgrade (prevent downgrades for now)
      const tierOrder = { starter: 1, pro: 2, enterprise: 3 }
      if (tierOrder[planTier] < tierOrder[currentSub.plan.tier]) {
        throw new SubscriptionError('Downgrading plans is not yet supported. Please contact support.')
      }

      // Check if current usage exceeds new plan limits
      const usage = await this.getUsageStats(tenantId)

      if (newPlan.max_users && usage.users.current > newPlan.max_users) {
        throw new SubscriptionError(
          `Cannot upgrade: Current user count (${usage.users.current}) exceeds plan limit (${newPlan.max_users})`
        )
      }

      if (newPlan.max_jobs_per_month && usage.jobs.thisMonth > newPlan.max_jobs_per_month) {
        throw new SubscriptionError(
          `Cannot upgrade: Jobs this month (${usage.jobs.thisMonth}) exceeds plan limit (${newPlan.max_jobs_per_month})`
        )
      }

      // Begin transaction
      await db.query('BEGIN')

      try {
        // Expire current subscription
        await db.query(`
          UPDATE tenant_subscriptions
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = $1
        `, [currentSub.subscription.id])

        // Create new subscription
        const newSubResult = await db.query(`
          INSERT INTO tenant_subscriptions (
            tenant_id, 
            plan_id, 
            status, 
            started_at,
            expires_at,
            auto_renew
          )
          VALUES ($1, $2, 'active', NOW(), $3, true)
          RETURNING id, started_at, expires_at
        `, [
          tenantId, 
          newPlan.id,
          currentSub.subscription.expiresAt // Maintain original expiry
        ])

        await db.query('COMMIT')

        // Clear subscription cache
        await redis.delete(`subscription:${tenantId}`)

        logger.info({
          event: 'SUBSCRIPTION_UPGRADED',
          tenantId,
          oldTier: currentSub.plan.tier,
          newTier: planTier,
          subscriptionId: newSubResult.rows[0].id
        })

        // Return updated subscription
        return await this.getCurrentSubscription(tenantId)
      } catch (error) {
        await db.query('ROLLBACK')
        throw error
      }
    } catch (error) {
      if (error instanceof ValidationError || 
          error instanceof SubscriptionError || 
          error instanceof NotFoundError) {
        throw error
      }
      logger.error({
        event: 'UPGRADE_PLAN_ERROR',
        tenantId,
        planTier,
        error: error.message
      })
      throw new SubscriptionError('Failed to upgrade plan')
    }
  }

  /**
   * Check if tenant has exceeded plan limits
   * @param {string} tenantId - Tenant ID
   * @param {string} limitType - Type of limit (users, jobs_per_month)
   * @returns {object} - Limit check result
   */
  async checkLimits(tenantId, limitType = null) {
    try {
      const subscription = await this.getCurrentSubscription(tenantId)
      const { limits } = subscription.plan
      const { usage } = subscription

      const checks = {}

      // Check user limit
      if (!limitType || limitType === 'users') {
        checks.users = {
          limit: limits.maxUsers,
          current: usage.users.current,
          remaining: limits.maxUsers ? limits.maxUsers - usage.users.current : null,
          exceeded: limits.maxUsers ? usage.users.current >= limits.maxUsers : false,
          unlimited: !limits.maxUsers
        }
      }

      // Check jobs limit
      if (!limitType || limitType === 'jobs_per_month') {
        checks.jobsPerMonth = {
          limit: limits.maxJobsPerMonth,
          current: usage.jobs.thisMonth,
          remaining: limits.maxJobsPerMonth ? limits.maxJobsPerMonth - usage.jobs.thisMonth : null,
          exceeded: limits.maxJobsPerMonth ? usage.jobs.thisMonth >= limits.maxJobsPerMonth : false,
          unlimited: !limits.maxJobsPerMonth
        }
      }

      return {
        plan: subscription.plan.tier,
        checks
      }
    } catch (error) {
      logger.error({
        event: 'CHECK_LIMITS_ERROR',
        tenantId,
        limitType,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get plan comparison
   * @returns {object} - Comparison of all plans
   */
  async getComparison() {
    try {
      const plans = await this.getPlans()

      return {
        plans: plans.map(plan => ({
          tier: plan.tier,
          name: plan.name,
          pricing: {
            monthly: plan.price_monthly,
            yearly: plan.price_yearly,
            yearlyDiscount: plan.price_yearly && plan.price_monthly 
              ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
              : null
          },
          limits: {
            users: plan.max_users || 'Unlimited',
            jobsPerMonth: plan.max_jobs_per_month || 'Unlimited'
          },
          features: plan.features
        })),
        comparison: {
          features: [
            'ai_chat',
            'advanced_reports',
            'custom_integrations',
            'priority_support',
            'bulk_operations',
            'api_access',
            'white_label',
            'dedicated_account_manager'
          ]
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_COMPARISON_ERROR',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Cancel subscription (for future implementation)
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Cancellation result
   */
  async cancelSubscription(tenantId) {
    // TODO: Implement subscription cancellation
    // - Set auto_renew to false
    // - Set status to 'cancelled' at end of period
    // - Send cancellation email
    throw new Error('Subscription cancellation not yet implemented')
  }

  /**
   * Reactivate subscription (for future implementation)
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Reactivation result
   */
  async reactivateSubscription(tenantId) {
    // TODO: Implement subscription reactivation
    throw new Error('Subscription reactivation not yet implemented')
  }
}

module.exports = new SubscriptionsService()
