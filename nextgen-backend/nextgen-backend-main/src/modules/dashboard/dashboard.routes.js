// ============================================
// src/modules/dashboard/dashboard.routes.js
// ============================================
const dashboardController = require('./dashboard.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function dashboardRoutes(fastify, options) {
  /**
   * @route GET /dashboard/overview
   * @desc Get dashboard overview statistics
   * @access Private
   */
  fastify.get('/overview', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get dashboard overview statistics',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
             }
          }
        }
      }
    }
  }, dashboardController.getOverview)

  /**
   * @route GET /dashboard/jobs-by-state
   * @desc Get jobs grouped by state
   * @access Private
   */
  fastify.get('/jobs-by-state', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get jobs grouped by state',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, dashboardController.getJobsByState)

  /**
   * @route GET /dashboard/jobs-by-priority
   * @desc Get jobs grouped by priority
   * @access Private
   */
  fastify.get('/jobs-by-priority', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get jobs grouped by priority',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, dashboardController.getJobsByPriority)

  /**
   * @route GET /dashboard/upcoming-jobs
   * @desc Get jobs due in next 7 days
   * @access Private
   */
  fastify.get('/upcoming-jobs', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get jobs due in next 7 days',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                jobs: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getUpcomingJobs)

  /**
   * @route GET /dashboard/overdue-jobs
   * @desc Get overdue jobs
   * @access Private
   */
  fastify.get('/overdue-jobs', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get overdue jobs',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                jobs: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getOverdueJobs)

  /**
   * @route GET /dashboard/staff-workload
   * @desc Get staff workload statistics
   * @access Private
   */
  fastify.get('/staff-workload', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get staff workload statistics',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                staff: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getStaffWorkload)

  /**
   * @route GET /dashboard/recent-activity
   * @desc Get recent activity log
   * @access Private
   */
  fastify.get('/recent-activity', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get recent activity log',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                activities: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getRecentActivity)

  /**
   * @route GET /dashboard/charts
   * @desc Get chart data for trends
   * @access Private
   */
  fastify.get('/charts', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get chart data for trends (last 30 days)',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                completionTrend: { type: 'array' },
                creationTrend: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getCharts)

  /**
   * @route GET /dashboard/top-clients
   * @desc Get top clients by job count
   * @access Private
   */
  fastify.get('/top-clients', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get top clients by job count',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                clients: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getTopClients)

  /**
   * @route GET /dashboard/kpis
   * @desc Get Key Performance Indicators
   * @access Private
   */
  fastify.get('/kpis', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get Key Performance Indicators',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, dashboardController.getKPIs)
}

module.exports = dashboardRoutes
