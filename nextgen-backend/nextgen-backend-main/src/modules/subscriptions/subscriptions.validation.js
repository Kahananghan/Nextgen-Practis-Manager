// ============================================
// src/modules/subscriptions/subscriptions.validation.js
// ============================================
const Joi = require('joi')

const subscriptionsValidation = {
  // Upgrade plan validation
  upgradePlan: {
    body: Joi.object({
      planTier: Joi.string()
        .valid('starter', 'pro', 'enterprise')
        .required()
        .messages({
          'any.only': 'Plan tier must be one of: starter, pro, enterprise'
        })
    })
  },

  // Check limits validation
  checkLimits: {
    query: Joi.object({
      type: Joi.string()
        .valid('users', 'jobs_per_month')
        .optional()
    })
  }
}

module.exports = subscriptionsValidation
