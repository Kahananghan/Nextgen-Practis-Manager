// ============================================
// src/modules/templates/templates.routes.js
// ============================================
const templatesController = require('./templates.controller')
const templatesValidation = require('./templates.validation')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function templatesRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all job templates',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }]
    }
  }, templatesController.getTemplates)

  fastify.get('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get template by ID with tasks',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }],
      //params: templatesValidation.uuidParam.params
    }
  }, templatesController.getTemplateById)

  fastify.post('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create new template',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }],
      //body: templatesValidation.createTemplate.body
    }
  }, templatesController.createTemplate)

  fastify.put('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update template',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }],
      //params: templatesValidation.uuidParam.params,
      //body: templatesValidation.updateTemplate.body
    }
  }, templatesController.updateTemplate)

  fastify.delete('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete template',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }],
      //params: templatesValidation.uuidParam.params
    }
  }, templatesController.deleteTemplate)

  fastify.post('/:id/create-job', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create job from template',
      tags: ['Templates'],
      security: [{ bearerAuth: [] }],
      //params: templatesValidation.uuidParam.params,
      //body: templatesValidation.createJobFromTemplate.body
    }
  }, templatesController.createJobFromTemplate)
}

module.exports = templatesRoutes
