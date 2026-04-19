// ============================================
// src/modules/timeTracking/timeTracking.controller.js
// Time Tracking Controller
// ============================================
const timeTrackingService = require('./timeTracking.service')
const logger = require('../../utils/logger')

class TimeTrackingController {
  /**
   * Get time entries for a job
   * GET /jobs/:jobId/time-entries
   */
  async getTimeEntries(request, reply) {
    try {
      const { jobId } = request.params
      const tenantId = request.user.tenantId
      const { userId, startDate, endDate } = request.query

      const entries = await timeTrackingService.getTimeEntries(jobId, tenantId, {
        userId,
        startDate,
        endDate
      })

      // Get totals
      const totals = await timeTrackingService.getJobTimeTotals(jobId, tenantId)

      return reply.send({
        success: true,
        data: {
          entries,
          totals
        }
      })
    } catch (error) {
      logger.error({ event: 'GET_TIME_ENTRIES_CONTROLLER_ERROR', error: error.message })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Get all time entries across all jobs
   * GET /time-entries
   */
  async getAllTimeEntries(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { userId, startDate, endDate } = request.query

      const entries = await timeTrackingService.getAllTimeEntries(tenantId, {
        userId,
        startDate,
        endDate
      })

      return reply.send({
        success: true,
        data: {
          entries
        }
      })
    } catch (error) {
      logger.error({ event: 'GET_ALL_TIME_ENTRIES_CONTROLLER_ERROR', error: error.message })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Log time entry
   * POST /jobs/:jobId/time-entries
   */
  async logTime(request, reply) {
    try {
      const { jobId } = request.params
      const tenantId = request.user.tenantId
      const userId = request.body.userId || request.user.userId 
      const {
        taskName,
        description,
        durationMinutes,
        entryDate,
        type = 'Billable',
        isTimerEntry = false
      } = request.body

      const entry = await timeTrackingService.logTimeEntry({
        tenantId,
        jobId,
        userId,
        taskName,
        description,
        durationMinutes,
        entryDate: entryDate || new Date().toISOString().split('T')[0],
        type,
        isTimerEntry
      })

      return reply.code(201).send({
        success: true,
        data: entry,
        message: 'Time logged successfully'
      })
    } catch (error) {
      logger.error({ event: 'LOG_TIME_CONTROLLER_ERROR', error: error.message })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Mark time entry as completed
   * PUT /time-entries/:entryId/complete
   */
  async markCompleted(request, reply) {
    try {
      const { entryId } = request.params
      const tenantId = request.user.tenantId
      const userId = request.user.userId

      const entry = await timeTrackingService.markCompleted(entryId, tenantId, userId)

      return reply.send({
        success: true,
        data: entry,
        message: 'Task marked as completed'
      })
    } catch (error) {
      logger.error({ event: 'MARK_COMPLETED_CONTROLLER_ERROR', error: error.message })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Delete time entry
   * DELETE /time-entries/:entryId
   */
  async deleteTimeEntry(request, reply) {
    try {
      const { entryId } = request.params
      const tenantId = request.user.tenantId
      const userId = request.user.userId

      await timeTrackingService.deleteTimeEntry(entryId, tenantId, userId)

      return reply.send({
        success: true,
        message: 'Time entry deleted'
      })
    } catch (error) {
      logger.error({ event: 'DELETE_TIME_ENTRY_CONTROLLER_ERROR', error: error.message })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }
}

module.exports = new TimeTrackingController()
