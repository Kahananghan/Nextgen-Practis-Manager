// ============================================
// src/modules/recurrence/recurrence.controller.js
// Job Recurrence Management Controller
// ============================================
const recurrenceService = require('./recurrence.service')
const logger = require('../../utils/logger')
const { ValidationError, NotFoundError } = require('../../utils/errors')

class RecurrenceController {
  /**
   * Create a new recurrence pattern
   * POST /recurrence/patterns
   */
  async createRecurrencePattern(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const userId = request.user.id
      const recurrenceData = {
        ...request.body,
        createdBy: userId
      }

      const pattern = await recurrenceService.createRecurrencePattern(tenantId, recurrenceData)

      return reply.code(201).send({
        success: true,
        data: pattern
      })
    } catch (error) {
      logger.error({
        event: 'CREATE_RECURRENCE_PATTERN_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        userId: request.user.id,
        error: error.message,
        stack: error.stack
      })

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return reply.code(400).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 400
          }
        })
      }

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to create recurrence pattern',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Update a recurrence pattern
   * PUT /recurrence/patterns/:id
   */
  async updateRecurrencePattern(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId
      const userId = request.user.id
      
      const updateData = {
        ...request.body,
        updatedBy: userId
      }

      const pattern = await recurrenceService.updateRecurrencePattern(id, tenantId, updateData)

      return reply.send({
        success: true,
        data: pattern
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_RECURRENCE_PATTERN_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        patternId: request.params.id,
        error: error.message
      })

      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 404
          }
        })
      }

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 400
          }
        })
      }

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to update recurrence pattern',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Delete a recurrence pattern
   * DELETE /recurrence/patterns/:id
   */
  async deleteRecurrencePattern(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      await recurrenceService.deleteRecurrencePattern(id, tenantId)

      return reply.send({
        success: true,
        message: 'Recurrence pattern deleted successfully'
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_RECURRENCE_PATTERN_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        patternId: request.params.id,
        error: error.message
      })

      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 404
          }
        })
      }

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to delete recurrence pattern',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get recurrence patterns
   * GET /recurrence/patterns
   */
  async getRecurrencePatterns(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const filters = request.query

      const result = await recurrenceService.getRecurrencePatterns(tenantId, filters)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'GET_RECURRENCE_PATTERNS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch recurrence patterns',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Process due recurrences (manual trigger)
   * POST /recurrence/process-due
   */
  async processDueRecurrences(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const results = await recurrenceService.processDueRecurrences(tenantId)

      return reply.send({
        success: true,
        data: results
      })
    } catch (error) {
      logger.error({
        event: 'PROCESS_DUE_RECURRENCES_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to process due recurrences',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get recurrence preview
   * GET /recurrence/preview
   */
  async getRecurrencePreview(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { jobId, frequency, intervalDaysBeforeDue = 5 } = request.query

      // Validate parameters
      if (!jobId || !frequency) {
        return reply.code(400).send({
          success: false,
          error: {
            name: 'ValidationError',
            message: 'jobId and frequency are required',
            statusCode: 400
          }
        })
      }

      const preview = await recurrenceService.getRecurrencePreview(tenantId, jobId, frequency, intervalDaysBeforeDue)

      return reply.send({
        success: true,
        data: preview
      })
    } catch (error) {
      logger.error({
        event: 'GET_RECURRENCE_PREVIEW_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 404
          }
        })
      }

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            statusCode: 400
          }
        })
      }

      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to generate recurrence preview',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new RecurrenceController()
