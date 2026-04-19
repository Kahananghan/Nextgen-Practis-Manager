// ============================================
// src/modules/timeTracking/timeTracking.routes.js
// Time Tracking Routes
// ============================================
const timeTrackingController = require('./timeTracking.controller')
const { authenticate } = require('../../middleware/auth')

async function timeTrackingRoutes(fastify, options) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate)

  /**
   * @route GET /jobs/:jobId/time-entries
   * @desc Get time entries for a job
   * @access Private
   */
  fastify.get('/jobs/:jobId/time-entries', {
    schema: {
      description: 'Get time entries for a job',
      tags: ['Time Tracking'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' }
        },
        required: ['jobId']
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, timeTrackingController.getTimeEntries)

  /**
   * @route GET /time-entries
   * @desc Get all time entries across all jobs
   * @access Private
   */
  fastify.get('/time-entries', {
    schema: {
      description: 'Get all time entries across all jobs',
      tags: ['Time Tracking'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, timeTrackingController.getAllTimeEntries)

  /**
   * @route POST /jobs/:jobId/time-entries
   * @desc Log time entry for a job
   * @access Private
   */
  fastify.post('/jobs/:jobId/time-entries', {
    schema: {
      description: 'Log time entry for a job',
      tags: ['Time Tracking'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' }
        },
        required: ['jobId']
      },
      body: {
        type: 'object',
        properties: {
          taskName: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          durationMinutes: { type: 'integer', minimum: 1 },
          entryDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['Billable', 'Non-billable'] },
          isTimerEntry: { type: 'boolean' }
        },
        required: ['taskName', 'durationMinutes']
      }
    }
  }, timeTrackingController.logTime)

  /**
   * @route PUT /time-entries/:entryId/complete
   * @desc Mark time entry as completed
   * @access Private
   */
  fastify.put('/time-entries/:entryId/complete', {
    schema: {
      description: 'Mark time entry/task as completed',
      tags: ['Time Tracking'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          entryId: { type: 'string', format: 'uuid' }
        },
        required: ['entryId']
      }
    }
  }, timeTrackingController.markCompleted)

  /**
   * @route DELETE /time-entries/:entryId
   * @desc Delete time entry
   * @access Private
   */
  fastify.delete('/time-entries/:entryId', {
    schema: {
      description: 'Delete time entry',
      tags: ['Time Tracking'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          entryId: { type: 'string', format: 'uuid' }
        },
        required: ['entryId']
      }
    }
  }, timeTrackingController.deleteTimeEntry)
}

module.exports = timeTrackingRoutes
