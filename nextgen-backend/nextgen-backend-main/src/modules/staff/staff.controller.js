// ============================================
// src/modules/staff/staff.controller.js
// ============================================
const staffService = require('./staff.service')
const logger = require('../../utils/logger')

class StaffController {
  async getStaff(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const result = await staffService.getStaff(tenantId, request.query)
      return reply.send({ success: true, data: result })
    } catch (error) {
      logger.error({ event: 'GET_STAFF_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch staff', statusCode: 500 } })
    }
  }

  async getStaffById(request, reply) {
    try {
      const staff = await staffService.getStaffById(request.params.id, request.user.tenantId)
      return reply.send({ success: true, data: staff })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async getStaffJobs(request, reply) {
    try {
      const jobs = await staffService.getStaffJobs(request.params.id, request.user.tenantId)
      return reply.send({ success: true, data: { jobs } })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async createStaff(request, reply) {
    try {
      const staff = await staffService.createStaff(request.user.tenantId, request.body)
      return reply.code(201).send({ success: true, data: staff, message: 'Staff member created successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async updateStaff(request, reply) {
    try {
      const staff = await staffService.updateStaff(request.params.id, request.user.tenantId, request.body)
      return reply.send({ success: true, data: staff, message: 'Staff member updated successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async deactivateStaff(request, reply) {
    try {
      const staff = await staffService.toggleActive(request.params.id, request.user.tenantId, false)
      return reply.send({ success: true, data: staff, message: 'Staff member deactivated successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async activateStaff(request, reply) {
    try {
      const staff = await staffService.toggleActive(request.params.id, request.user.tenantId, true)
      return reply.send({ success: true, data: staff, message: 'Staff member activated successfully' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async deleteStaff(request, reply) {
    try {
      await staffService.deleteStaff(request.params.id, request.user.tenantId)
      return reply.send({ success: true, message: 'Staff member deleted successfully (deactivated)' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }
}

module.exports = new StaffController()
