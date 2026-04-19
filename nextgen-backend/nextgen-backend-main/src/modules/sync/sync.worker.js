// ============================================
// src/modules/sync/sync.worker.js
// BullMQ Worker - Processes sync jobs
// ============================================
const { Worker } = require('bullmq')
const config = require('../../config')
const db = require('../../config/database')
const redis = require('../../config/redis')
const syncService = require('./sync.service')
const logger = require('../../utils/logger')

// Initialize connections
let isDbConnected = false
let isRedisConnected = false

const initializeDatabase = async () => {
  if (!isDbConnected) {
    try {
      await db.connect()
      isDbConnected = true
      logger.info({
        event: 'WORKER_DB_CONNECTED',
        message: 'Database connection established for worker'
      })
    } catch (error) {
      logger.error({
        event: 'WORKER_DB_CONNECTION_FAILED',
        error: error.message
      })
      throw error
    }
  }
}

const initializeRedis = async () => {
  if (!isRedisConnected) {
    try {
      redis.connect()
      isRedisConnected = true
      logger.info({
        event: 'WORKER_REDIS_CONNECTED',
        message: 'Redis connection established for worker'
      })
    } catch (error) {
      logger.error({
        event: 'WORKER_REDIS_CONNECTION_FAILED',
        error: error.message
      })
      throw error
    }
  }
}

// Create worker
const syncWorker = new Worker(
  'xpm-sync',
  async (job) => {
    const { userId, tenantId } = job.data

    // Ensure database and Redis are connected before processing
    await initializeDatabase()
    await initializeRedis()

    logger.info({
      event: 'SYNC_JOB_PROCESSING',
      jobId: job.id,
      jobName: job.name,
      tenantId,
      attempt: job.attemptsMade + 1
    })

    try {
      let result

      switch (job.name) {
        case 'full-sync':
          result = await syncService.fullSync(userId, tenantId)
          break

        case 'delta-sync':
          result = await syncService.deltaSync(userId, tenantId)
          break

        default:
          throw new Error(`Unknown job type: ${job.name}`)
      }

      logger.info({
        event: 'SYNC_JOB_COMPLETED',
        jobId: job.id,
        jobName: job.name,
        tenantId,
        totalRecords: result.totalRecords,
        duration: result.duration
      })

      return result
    } catch (error) {
      logger.error({
        event: 'SYNC_JOB_FAILED',
        jobId: job.id,
        jobName: job.name,
        tenantId,
        attempt: job.attemptsMade + 1,
        error: error.message,
        stack: error.stack
      })

      throw error
    }
  },
  {
    connection: {
      host: config.redis.host,
      port: config.redis.port
    },
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000 // Per minute
    }
  }
)

// Event handlers
syncWorker.on('completed', (job, result) => {
  logger.info({
    event: 'WORKER_JOB_COMPLETED',
    jobId: job.id,
    tenantId: job.data.tenantId,
    totalRecords: result.totalRecords
  })
})

syncWorker.on('failed', (job, error) => {
  logger.error({
    event: 'WORKER_JOB_FAILED',
    jobId: job?.id,
    tenantId: job?.data?.tenantId,
    error: error.message
  })
})

syncWorker.on('error', (error) => {
  logger.error({
    event: 'WORKER_ERROR',
    error: error.message
  })
})

syncWorker.on('stalled', (jobId) => {
  logger.warn({
    event: 'WORKER_JOB_STALLED',
    jobId
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ event: 'WORKER_SHUTDOWN_START' })
  await syncWorker.close()
  
  // Close connections
  if (isDbConnected) {
    await db.disconnect()
  }
  if (isRedisConnected) {
    await redis.disconnect()
  }
  
  logger.info({ event: 'WORKER_SHUTDOWN_COMPLETE' })
  process.exit(0)
})

module.exports = syncWorker
