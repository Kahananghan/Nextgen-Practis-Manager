// ============================================
// src/app.js - Fastify Application Setup
// ============================================
const fastify = require('fastify')
const cors = require('@fastify/cors')
const helmet = require('@fastify/helmet')
const rateLimit = require('@fastify/rate-limit')
const jwt = require('@fastify/jwt')
const cookie = require('@fastify/cookie')
const session = require('@fastify/session')
const swagger = require('@fastify/swagger')
const swaggerUI = require('@fastify/swagger-ui')
const multipart = require('@fastify/multipart')

const config = require('./config')
const logger = require('./utils/logger')
const { errorHandler, notFoundHandler } = require('./middleware/error-handler')
const db = require('./config/database')
const redis = require('./config/redis')
const setupSocket = require('./realtime/socket')

/**
 * Build Fastify application
 */
async function buildApp() {
  const app = fastify({
    logger: {
      level: config.logging.level,
      stream: logger.stream
    },
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
    requestIdLogLabel: 'requestId'
  })

  // ============================================
  // Register Plugins
  // ============================================

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: config.isProduction,
    crossOriginEmbedderPolicy: config.isProduction
  })

  // CORS
  await app.register(cors, {
    origin: config.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })

  // Rate limiting
  await app.register(rateLimit, {
    max: config.security.rateLimit.max,
    timeWindow: config.security.rateLimit.timeWindow,
    redis: redis.client
  })

  // JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn
    }
  })

  // Cookies
  await app.register(cookie)

  // Multipart (file uploads)
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024 // 25MB
    }
  })

  // Session (for OAuth flows)
  await app.register(session, {
    secret: config.session.secret,
    cookie: {
      secure: config.session.secure,
      httpOnly: config.session.httpOnly,
      sameSite: config.session.sameSite,
      maxAge: config.session.maxAge
    },
    store: {
      // Use Redis for session storage
      set: async (sessionId, session, callback) => {
        try {
          await redis.set(`session:${sessionId}`, session, config.session.maxAge / 1000)
          callback()
        } catch (error) {
          callback(error)
        }
      },
      get: async (sessionId, callback) => {
        try {
          const session = await redis.get(`session:${sessionId}`)
          callback(null, session)
        } catch (error) {
          callback(error)
        }
      },
      destroy: async (sessionId, callback) => {
        try {
          await redis.delete(`session:${sessionId}`)
          callback()
        } catch (error) {
          callback(error)
        }
      }
    }
  })

  // Swagger documentation (development only)
  if (config.isDevelopment) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Practis Manager API',
          description: 'XPM Enhancement Layer API Documentation',
          version: '1.0.0'
        },
        servers: [
          {
            url: `http://localhost:${config.server.port}`,
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    })

    await app.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    })
  }

  // ============================================
  // Health Check Endpoints
  // ============================================

  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  app.get('/health/detailed', async (request, reply) => {
    const dbHealth = await db.healthCheck()
    const redisHealth = await redis.healthCheck()

    const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy'

    return reply.code(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth
      }
    })
  })

  // ============================================
  // Register Routes
  // ============================================

  // Auth routes
  await app.register(require('./modules/auth/auth.routes'), { prefix: '/auth' })

  // Subscriptions routes
  await app.register(require('./modules/subscriptions/subscriptions.routes'), { prefix: '/subscriptions' })

  // Integrations routes
  await app.register(require('./modules/integrations/xero/xero.routes'), { prefix: '/integrations' })

  // Sync routes
  await app.register(require('./modules/sync/sync.routes'), { prefix: '/sync' })

  // Dashboard routes
  await app.register(require('./modules/dashboard/dashboard.routes'), { prefix: '/dashboard' })

  // Jobs routes
  await app.register(require('./modules/jobs/jobs.routes'), { prefix: '/jobs' })

  // Time Tracking routes (extends jobs)
  await app.register(require('./modules/timeTracking/timeTracking.routes'))

  // Clients routes
  await app.register(require('./modules/clients/clients.routes'), { prefix: '/clients' })
  // Contacts routes (mounted at /clients for nested endpoints)
  await app.register(require('./modules/contacts/contacts.routes'))

  // Staff routes
  await app.register(require('./modules/staff/staff.routes'), { prefix: '/staff' })

  // Templates routes
  await app.register(require('./modules/templates/templates.routes'), { prefix: '/templates' })

  // Reports routes
  await app.register(require('./modules/reports/reports.routes'), { prefix: '/reports' })

  // Invoices routes
  await app.register(require('./modules/invoices/invoice.routes'))

  // Roles routes
  await app.register(require('./modules/roles/roles.routes'), { prefix: '/roles' })

  // Alerts routes
  await app.register(require('./modules/alerts'), { prefix: '/alerts' })

  // Notifications routes
  await app.register(require('./modules/notifications/notifications.routes'), { prefix: '/notifications' })

  // Settings routes
  await app.register(require('./modules/settings/settings.routes'), { prefix: '/settings' })

  // Analytics routes
  await app.register(require('./modules/analytics/analytics.routes'), { prefix: '/analytics' })

  // Chat routes (1:1)
  await app.register(require('./modules/chat/chat.routes'))

  // Recurrence routes
  await app.register(require('./modules/recurrence/recurrence.routes'), { prefix: '/recurrence' })

  // Document Requests routes
  await app.register(require('./modules/documentRequests/documentRequests.routes'), { prefix: '/api' })

  // Proposals routes
  await app.register(require('./modules/proposals/proposals.routes'), { prefix: '/api/proposals' })

  // Xero integration routes (with prefix for other routes)
  await app.register(require('./modules/integrations/xero/xero.routes'), { prefix: '/integrations/xero' })

  // Health check
  // app.get('/health', async (request, reply) => {
  //   return { status: 'ok', timestamp: new Date().toISOString() }
  // })

  // Root route
  app.get('/', async (request, reply) => {
    return {
      name: 'Practis Manager API',
      version: '1.0.0',
      status: 'running',
      docs: config.isDevelopment ? `http://localhost:${config.server.port}/docs` : null
    }
  })

  // ============================================
  // Error Handlers
  // ============================================

  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  // ============================================
  // Realtime (Socket.IO)
  // ============================================
  setupSocket(app)

  return app
}

module.exports = buildApp
