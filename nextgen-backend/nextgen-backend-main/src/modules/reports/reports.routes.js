// ============================================
// src/modules/reports/reports.routes.js
// ============================================
const reportsController = require('./reports.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')
const Joi = require('joi')

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso()
})

async function reportsRoutes(fastify, options) {
  fastify.get('/jobs', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Generate jobs summary report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      //querystring: dateRangeSchema
    }
  }, reportsController.generateJobsReport)

  fastify.get('/clients', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Generate client activity report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      //querystring: dateRangeSchema
    }
  }, reportsController.generateClientReport)

  fastify.get('/staff', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Generate staff performance report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      //querystring: dateRangeSchema
    }
  }, reportsController.generateStaffReport)

  fastify.get('/financial', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Generate financial summary report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      //querystring: dateRangeSchema
    }
  }, reportsController.generateFinancialReport)

  fastify.get('/overview', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Generate overview report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }]
    }
  }, reportsController.generateOverviewReport)

  fastify.get('/export/:type', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Export report (JSON or CSV)',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      // params: Joi.object({
      //   type: Joi.string().valid('jobs', 'clients', 'staff', 'financial').required()
      // }),
      // querystring: Joi.object({
      //   format: Joi.string().valid('json', 'csv').default('json'),
      //   startDate: Joi.date().iso(),
      //   endDate: Joi.date().iso()
      // })
    }
  }, reportsController.exportReport)
}

module.exports = reportsRoutes
