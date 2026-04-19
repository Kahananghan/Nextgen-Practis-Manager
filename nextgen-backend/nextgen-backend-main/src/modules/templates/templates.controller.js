// ============================================
// src/modules/templates/templates.controller.js
// ============================================
const templatesService = require('./templates.service')
const logger = require('../../utils/logger')

class TemplatesController {
  async getTemplates(request, reply) {
    try {
      const templates = await templatesService.getTemplates(request.user.tenantId)
      return reply.send({ success: true, data: { templates } })
    } catch (error) {
      logger.error({ event: 'GET_TEMPLATES_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch templates', statusCode: 500 } })
    }
  }

  async getTemplateById(request, reply) {
    try {
      const template = await templatesService.getTemplateById(request.params.id, request.user.tenantId)
      return reply.send({ success: true, data: template })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async createTemplate(request, reply) {
    try {
      const template = await templatesService.createTemplate(request.user.tenantId, request.body)
      return reply.code(201).send({ success: true, data: template, message: 'Template created successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async updateTemplate(request, reply) {
    try {
      const template = await templatesService.updateTemplate(request.params.id, request.user.tenantId, request.body)
      return reply.send({ success: true, data: template, message: 'Template updated successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async deleteTemplate(request, reply) {
    try {
      await templatesService.deleteTemplate(request.params.id, request.user.tenantId)
      return reply.send({ success: true, message: 'Template deleted successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async createJobFromTemplate(request, reply) {
    try {
      const job = await templatesService.createJobFromTemplate(request.params.id, request.user.tenantId, request.body)
      return reply.code(201).send({ success: true, data: job, message: 'Job created from template successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }
}

module.exports = new TemplatesController()
