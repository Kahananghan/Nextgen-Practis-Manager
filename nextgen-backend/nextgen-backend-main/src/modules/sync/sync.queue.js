// ============================================
// src/modules/sync/sync.queue.js
// BullMQ Queue Configuration
// ============================================
const { Queue } = require('bullmq')
const config = require('../../config')
const logger = require('../../utils/logger')

// Create sync queue
const syncQueue = new Queue('xpm-sync', {
  connection: {
    host: config.redis.host,
    port: config.redis.port
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // Start with 5 seconds
    },
    removeOnComplete: {
      count: 100 // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50 // Keep last 50 failed jobs
    }
  }
})

class SyncQueueService {
  /**
   * Add full sync job to queue
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Job} - BullMQ job
   */
  async addFullSync(userId, tenantId) {
    try {
      const job = await syncQueue.add(
        'full-sync',
        { userId, tenantId },
        {
          priority: 1, // High priority
          jobId: `full-sync-${tenantId}-${Date.now()}`
        }
      )

      logger.info({
        event: 'FULL_SYNC_JOB_ADDED',
        jobId: job.id,
        tenantId
      })

      return job
    } catch (error) {
      logger.error({
        event: 'ADD_FULL_SYNC_JOB_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Add delta sync job to queue
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Job} - BullMQ job
   */
  async addDeltaSync(userId, tenantId) {
    try {
      const job = await syncQueue.add(
        'delta-sync',
        { userId, tenantId },
        {
          priority: 2, // Medium priority
          jobId: `delta-sync-${tenantId}-${Date.now()}`
        }
      )

      logger.info({
        event: 'DELTA_SYNC_JOB_ADDED',
        jobId: job.id,
        tenantId
      })

      return job
    } catch (error) {
      logger.error({
        event: 'ADD_DELTA_SYNC_JOB_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Schedule recurring delta sync
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {string} cron - Cron expression (default: every 15 minutes)
   */
  async scheduleDeltaSync(userId, tenantId, cron = '*/15 * * * *') {
    try {
      const job = await syncQueue.add(
        'delta-sync',
        { userId, tenantId },
        {
          repeat: {
            pattern: cron
          },
          jobId: `recurring-delta-sync-${tenantId}`
        }
      )

      logger.info({
        event: 'DELTA_SYNC_SCHEDULED',
        jobId: job.id,
        tenantId,
        cron
      })

      return job
    } catch (error) {
      logger.error({
        event: 'SCHEDULE_DELTA_SYNC_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Remove scheduled sync for tenant
   * @param {string} tenantId - Tenant ID
   */
  async removeScheduledSync(tenantId) {
    try {
      const jobId = `recurring-delta-sync-${tenantId}`
      const repeatableJobs = await syncQueue.getRepeatableJobs()
      
      const job = repeatableJobs.find(j => j.id === jobId)
      
      if (job) {
        await syncQueue.removeRepeatableByKey(job.key)
        
        logger.info({
          event: 'SCHEDULED_SYNC_REMOVED',
          tenantId,
          jobId
        })
      }
    } catch (error) {
      logger.error({
        event: 'REMOVE_SCHEDULED_SYNC_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    try {
      const waiting = await syncQueue.getWaitingCount()
      const active = await syncQueue.getActiveCount()
      const completed = await syncQueue.getCompletedCount()
      const failed = await syncQueue.getFailedCount()
      const delayed = await syncQueue.getDelayedCount()

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      }
    } catch (error) {
      logger.error({
        event: 'GET_QUEUE_STATS_ERROR',
        error: error.message
      })
      throw error
    }
  }
}

module.exports = new SyncQueueService()
module.exports.queue = syncQueue
