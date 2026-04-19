// ============================================
// server.js - Application Entry Point
// ============================================
const buildApp = require('./src/app')
const config = require('./src/config')
const logger = require('./src/utils/logger')
const db = require('./src/config/database')
const redis = require('./src/config/redis')
const jobs = require('./src/jobs')

let app = null

/**
 * Start the server
 */
async function start() {
  try {
    logger.info({
      event: 'SERVER_START',
      status: 'STARTING',
      environment: config.env
    })

    // Connect to databases
    logger.info('Connecting to PostgreSQL...')
    await db.connect()

    logger.info('Connecting to Redis...')
    redis.connect()

    // Build and start Fastify app
    logger.info('Building Fastify application...')
    app = await buildApp()

    // Initialize cron jobs
    logger.info('Initializing cron jobs...')
    jobs.initAllJobs()

    await app.listen({
      port: config.server.port,
      host: config.server.host
    })

    logger.info({
      event: 'SERVER_START',
      status: 'SUCCESS',
      port: config.server.port,
      host: config.server.host,
      environment: config.env,
      docs: config.isDevelopment ? `http://localhost:${config.server.port}/docs` : null
    })

    console.log('\n' + '='.repeat(60))
    console.log(`🚀 Practis Manager Backend is running!`)
    console.log(`   Environment: ${config.env}`)
    console.log(`   Address: http://${config.server.host}:${config.server.port}`)
    if (config.isDevelopment) {
      console.log(`   API Docs: http://localhost:${config.server.port}/docs`)
    }
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    logger.error({
      event: 'SERVER_START',
      status: 'FAILURE',
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  logger.info({
    event: 'SERVER_SHUTDOWN',
    status: 'STARTING',
    signal
  })

  try {
    // Close Fastify server
    if (app) {
      logger.info('Closing Fastify server...')
      await app.close()
    }

    // Close database connections
    logger.info('Closing database connections...')
    await db.disconnect()
    await redis.disconnect()

    logger.info({
      event: 'SERVER_SHUTDOWN',
      status: 'SUCCESS',
      signal
    })

    process.exit(0)
  } catch (error) {
    logger.error({
      event: 'SERVER_SHUTDOWN',
      status: 'FAILURE',
      error: error.message
    })
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({
    event: 'UNCAUGHT_EXCEPTION',
    error: error.message,
    stack: error.stack
  })
  shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    event: 'UNHANDLED_REJECTION',
    reason,
    promise
  })
  shutdown('unhandledRejection')
})

// Start the server
start()
