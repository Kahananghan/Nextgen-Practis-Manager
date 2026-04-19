// ============================================
// worker.js - Background Worker Entry Point
// Starts BullMQ workers for background jobs
// ============================================
require('dotenv').config()
const logger = require('./src/utils/logger')

// Import workers
const syncWorker = require('./src/modules/sync/sync.worker')

logger.info({
  event: 'WORKER_STARTUP',
  env: process.env.NODE_ENV || 'development'
})

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info({
    event: 'WORKER_SHUTDOWN_SIGNAL',
    signal
  })

  try {
    await syncWorker.close()
    
    logger.info({
      event: 'WORKER_SHUTDOWN_SUCCESS'
    })
    
    process.exit(0)
  } catch (error) {
    logger.error({
      event: 'WORKER_SHUTDOWN_ERROR',
      error: error.message
    })
    
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({
    event: 'UNCAUGHT_EXCEPTION',
    error: error.message,
    stack: error.stack
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    event: 'UNHANDLED_REJECTION',
    reason,
    promise
  })
})

logger.info({
  event: 'WORKER_READY',
  message: 'Background workers are running'
})
