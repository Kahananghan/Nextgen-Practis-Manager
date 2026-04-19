// ============================================
// src/modules/sync/sync.controller.js
// ============================================
const syncService = require('./sync.service')
const syncQueue = require('./sync.queue')
const logger = require('../../utils/logger')

class SyncController {
  /**
   * Trigger full sync
   * POST /sync/full
   */
  async triggerFullSync(request, reply) {
    try {
      const userId = request.user.userId
      const tenantId = request.user.tenantId

      // Add job to queue
      const job = await syncQueue.addFullSync(userId, tenantId)

      logger.info({
        event: 'FULL_SYNC_QUEUED',
        userId,
        tenantId,
        jobId: job.id
      })

      return reply.send({
        success: true,
        data: {
          message: 'Full sync started',
          jobId: job.id
        }
      })
    } catch (error) {
      logger.error({
        event: 'TRIGGER_FULL_SYNC_ERROR',
        userId: request.user.userId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to start full sync',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Trigger delta sync
   * POST /sync/delta
   */
  async triggerDeltaSync(request, reply) {
    try {
      const userId = request.user.userId
      const tenantId = request.user.tenantId

      // Add job to queue
      const job = await syncQueue.addDeltaSync(userId, tenantId)

      logger.info({
        event: 'DELTA_SYNC_QUEUED',
        userId,
        tenantId,
        jobId: job.id
      })

      return reply.send({
        success: true,
        data: {
          message: 'Delta sync started',
          jobId: job.id
        }
      })
    } catch (error) {
      logger.error({
        event: 'TRIGGER_DELTA_SYNC_ERROR',
        userId: request.user.userId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to start delta sync',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get sync status and history
   * GET /sync/status
   */
  async getSyncStatus(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const statusData = await syncService.getSyncStatus(tenantId)
      const stats = await syncService.getSyncStats(tenantId)

      return reply.send({
        success: true,
        data: {
          ...statusData,
          stats
        }
      })
    } catch (error) {
      logger.error({
        event: 'GET_SYNC_STATUS_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch sync status',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get sync statistics
   * GET /sync/stats
   */
  async getSyncStats(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const stats = await syncService.getSyncStats(tenantId)

      return reply.send({
        success: true,
        data: stats
      })
    } catch (error) {
      logger.error({
        event: 'GET_SYNC_STATS_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch sync statistics',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new SyncController()
