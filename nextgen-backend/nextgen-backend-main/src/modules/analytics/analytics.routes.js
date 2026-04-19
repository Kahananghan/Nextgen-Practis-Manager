// ============================================
// src/modules/analytics/analytics.routes.js
// ============================================
const analyticsController = require('./analytics.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')
const Joi = require('joi')

async function analyticsRoutes(fastify, options) {
  fastify.get('/trends', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get trend analysis with moving averages and growth rates',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      // querystring: Joi.object({
      //   months: Joi.number().integer().min(1).max(24).default(6),
      //   metric: Joi.string().valid('revenue', 'jobs', 'completion').default('revenue')
      // })
    }
  }, analyticsController.getTrendAnalysis)

  fastify.get('/statistics', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get statistical analysis (mean, median, std dev, percentiles)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }]
    }
  }, analyticsController.getStatisticalAnalysis)

  fastify.get('/comparison', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Compare current period vs previous period',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      // querystring: Joi.object({
      //   type: Joi.string().valid('month', 'quarter', 'year').default('month')
      // })
    }
  }, analyticsController.getPeriodComparison)

  fastify.get('/performance', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get performance metrics (efficiency, utilization, engagement)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }]
    }
  }, analyticsController.getPerformanceMetrics)

  fastify.get('/anomalies', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Detect anomalies and unusual patterns',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }]
    }
  }, analyticsController.detectAnomalies)

  fastify.get('/multi-dimensional', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get multi-dimensional analysis (cross-tabulations)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }]
    }
  }, analyticsController.getMultiDimensionalAnalysis)
}

module.exports = analyticsRoutes
