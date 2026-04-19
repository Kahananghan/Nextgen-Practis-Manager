// ============================================
// src/middleware/plan-guard.js - Subscription Plan Feature Gating
// ============================================
const { SubscriptionError } = require('../utils/errors')
const db = require('../config/database')
const redis = require('../config/redis')
const logger = require('../utils/logger')

/**
 * Require specific feature to be available in tenant's plan
 * @param {string} feature - Feature name (e.g., 'ai_chat', 'advanced_reports')
 */
function requireFeature(feature) {
  return async (request, reply) => {
    try {
      const tenantId = request.user.tenantId
      const subscription = await getActiveSubscription(tenantId)

      if (!subscription) {
        throw new SubscriptionError('No active subscription found')
      }

      const hasFeature = subscription.plan.features[feature]

      if (!hasFeature) {
        logger.warn({
          event: 'FEATURE_BLOCKED',
          tenantId,
          feature,
          currentPlan: subscription.plan.tier
        })
        throw new SubscriptionError(
          `Feature '${feature}' not available in your ${subscription.plan.tier} plan. Please upgrade.`
        )
      }

      logger.debug({
        event: 'FEATURE_GRANTED',
        tenantId,
        feature
      })
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error
      }
      logger.error({
        event: 'FEATURE_CHECK_ERROR',
        error: error.message
      })
      throw new SubscriptionError('Feature check failed')
    }
  }
}

/**
 * Check usage limits before allowing action
 * @param {string} limitType - Limit type (e.g., 'users', 'jobs_per_month')
 * @param {number} increment - How much to increment by (default: 1)
 */
function checkLimit(limitType, increment = 1) {
  return async (request, reply) => {
    try {
      const tenantId = request.user.tenantId
      const subscription = await getActiveSubscription(tenantId)

      if (!subscription) {
        throw new SubscriptionError('No active subscription found')
      }

      const usage = await getCurrentUsage(tenantId, limitType)
      const limit = subscription.plan[`max_${limitType}`]

      // Null limit means unlimited
      if (limit === null) {
        return
      }

      if (usage + increment > limit) {
        logger.warn({
          event: 'LIMIT_EXCEEDED',
          tenantId,
          limitType,
          usage,
          limit,
          currentPlan: subscription.plan.tier
        })
        throw new SubscriptionError(
          `${limitType} limit exceeded (${usage}/${limit}). Please upgrade your plan.`
        )
      }

      logger.debug({
        event: 'LIMIT_CHECK_PASSED',
        tenantId,
        limitType,
        usage,
        limit
      })
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error
      }
      logger.error({
        event: 'LIMIT_CHECK_ERROR',
        error: error.message
      })
      throw new SubscriptionError('Limit check failed')
    }
  }
}

/**
 * Get active subscription for tenant (with caching)
 */
async function getActiveSubscription(tenantId) {
  const cacheKey = `subscription:${tenantId}`
  
  // Check cache first
  let subscription = await redis.get(cacheKey)
  
  if (!subscription) {
    // Fetch from database
    const result = await db.query(`
      SELECT 
        ts.id,
        ts.status,
        ts.started_at,
        ts.expires_at,
        sp.name as plan_name,
        sp.tier as plan_tier,
        sp.max_users,
        sp.max_jobs_per_month,
        sp.features as plan_features
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.tenant_id = $1
      AND ts.status = 'active'
      AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
      ORDER BY ts.started_at DESC
      LIMIT 1
    `, [tenantId])

    if (result.rows.length === 0) {
      return null
    }

    subscription = {
      id: result.rows[0].id,
      status: result.rows[0].status,
      startedAt: result.rows[0].started_at,
      expiresAt: result.rows[0].expires_at,
      plan: {
        name: result.rows[0].plan_name,
        tier: result.rows[0].plan_tier,
        max_users: result.rows[0].max_users,
        max_jobs_per_month: result.rows[0].max_jobs_per_month,
        features: result.rows[0].plan_features
      }
    }

    // Cache for 10 minutes
    await redis.set(cacheKey, subscription, 600)
  }

  return subscription
}

/**
 * Get current usage for a limit type
 */
async function getCurrentUsage(tenantId, limitType) {
  switch (limitType) {
    case 'users': {
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE tenant_id = $1 AND status = 'active'
      `, [tenantId])
      return parseInt(result.rows[0].count)
    }

    case 'jobs_per_month': {
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_jobs
        WHERE tenant_id = $1
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `, [tenantId])
      return parseInt(result.rows[0].count)
    }

    default:
      return 0
  }
}

/**
 * Clear subscription cache for tenant (call after plan change)
 */
async function clearSubscriptionCache(tenantId) {
  await redis.delete(`subscription:${tenantId}`)
  logger.info({
    event: 'SUBSCRIPTION_CACHE_CLEARED',
    tenantId
  })
}

module.exports = {
  requireFeature,
  checkLimit,
  getActiveSubscription,
  clearSubscriptionCache
}
