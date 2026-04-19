// ============================================
// src/modules/settings/settings.routes.js
// ============================================
const settingsController = require('./settings.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')
const Joi = require('joi')

async function settingsRoutes(fastify, options) {
  fastify.get('/user', {
    preHandler: [authenticate],
    schema: {
      description: 'Get user settings',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }]
    }
  }, settingsController.getUserSettings)

  fastify.put('/user', {
    preHandler: [authenticate],
    schema: {
      description: 'Update user settings',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }],
      // body: Joi.object({
      //   theme: Joi.string().valid('light', 'dark'),
      //   language: Joi.string(),
      //   timezone: Joi.string(),
      //   dateFormat: Joi.string(),
      //   timeFormat: Joi.string().valid('12h', '24h'),
      //   emailNotifications: Joi.boolean(),
      //   desktopNotifications: Joi.boolean(),
      //   dashboardLayout: Joi.string()
      // })
    }
  }, settingsController.updateUserSettings)

  fastify.get('/tenant', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get tenant settings',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }]
    }
  }, settingsController.getTenantSettings)

  fastify.put('/tenant', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update tenant settings',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }],
      // body: Joi.object({
      //   companyName: Joi.string(),
      //   companyLogo: Joi.string().uri().allow(null),
      //   businessHours: Joi.object({
      //     start: Joi.string(),
      //     end: Joi.string(),
      //     timezone: Joi.string()
      //   }),
      //   defaultJobPriority: Joi.string().valid('Low', 'Normal', 'Medium', 'High'),
      //   defaultJobState: Joi.string().valid('Planned', 'In Progress', 'On Hold', 'Complete'),
      //   fiscalYearStart: Joi.string(),
      //   currency: Joi.string(),
      //   taxRate: Joi.number(),
      //   brandColor: Joi.string(),
      //   features: Joi.object()
      // })
    }
  }, settingsController.updateTenantSettings)

  fastify.get('/billing', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get billing settings',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }]
    }
  }, settingsController.getBillingSettings)

  fastify.post('/user/reset', {
    preHandler: [authenticate],
    schema: {
      description: 'Reset user settings to defaults',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }]
    }
  }, settingsController.resetUserSettings)

  fastify.get('/all', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all settings (user + tenant)',
      tags: ['Settings'],
      security: [{ bearerAuth: [] }]
    }
  }, settingsController.getAllSettings)
}

module.exports = settingsRoutes
