// ============================================
// src/modules/settings/settings.controller.js
// ============================================
const settingsService = require('./settings.service')
const logger = require('../../utils/logger')

class SettingsController {
  async getUserSettings(request, reply) {
    try {
      const settings = await settingsService.getUserSettings(request.user.userId)
      return reply.send({ success: true, data: settings })
    } catch (error) {
      logger.error({ event: 'GET_USER_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch user settings', statusCode: 500 } })
    }
  }

  async updateUserSettings(request, reply) {
    try {
      const settings = await settingsService.updateUserSettings(request.user.userId, request.body)
      return reply.send({ success: true, data: settings, message: 'Settings updated successfully' })
    } catch (error) {
      logger.error({ event: 'UPDATE_USER_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to update settings', statusCode: 500 } })
    }
  }

  async getTenantSettings(request, reply) {
    try {
      const settings = await settingsService.getTenantSettings(request.user.tenantId)
      return reply.send({ success: true, data: settings })
    } catch (error) {
      logger.error({ event: 'GET_TENANT_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch tenant settings', statusCode: 500 } })
    }
  }

  async updateTenantSettings(request, reply) {
    try {
      const settings = await settingsService.updateTenantSettings(request.user.tenantId, request.body)
      return reply.send({ success: true, data: settings, message: 'Tenant settings updated successfully' })
    } catch (error) {
      logger.error({ event: 'UPDATE_TENANT_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to update tenant settings', statusCode: 500 } })
    }
  }

  async getBillingSettings(request, reply) {
    try {
      const settings = await settingsService.getBillingSettings(request.user.tenantId)
      return reply.send({ success: true, data: settings })
    } catch (error) {
      logger.error({ event: 'GET_BILLING_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch billing settings', statusCode: 500 } })
    }
  }

  async resetUserSettings(request, reply) {
    try {
      const settings = await settingsService.resetUserSettings(request.user.userId)
      return reply.send({ success: true, data: settings, message: 'Settings reset to defaults' })
    } catch (error) {
      logger.error({ event: 'RESET_USER_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to reset settings', statusCode: 500 } })
    }
  }

  async getAllSettings(request, reply) {
    try {
      const settings = await settingsService.getAllSettings(request.user.userId, request.user.tenantId)
      return reply.send({ success: true, data: settings })
    } catch (error) {
      logger.error({ event: 'GET_ALL_SETTINGS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch settings', statusCode: 500 } })
    }
  }
}

module.exports = new SettingsController()
