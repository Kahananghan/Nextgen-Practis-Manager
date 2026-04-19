// ============================================
// src/modules/dashboard/dashboard.controller.js
// ============================================
const dashboardService = require('./dashboard.service')
const logger = require('../../utils/logger')

class DashboardController {
  /**
   * Get dashboard overview
   * GET /dashboard/overview
   */
  async getOverview(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const overview = await dashboardService.getOverview(tenantId)

      return reply.send({
        success: true,
        data: overview
      })
    } catch (error) {
      logger.error({
        event: 'GET_OVERVIEW_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch dashboard overview',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get jobs by state
   * GET /dashboard/jobs-by-state
   */
  async getJobsByState(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const data = await dashboardService.getJobsByState(tenantId)

      return reply.send({
        success: true,
        data
      })
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_BY_STATE_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch jobs by state',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get jobs by priority
   * GET /dashboard/jobs-by-priority
   */
  async getJobsByPriority(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const data = await dashboardService.getJobsByPriority(tenantId)

      return reply.send({
        success: true,
        data
      })
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_BY_PRIORITY_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch jobs by priority',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get upcoming jobs
   * GET /dashboard/upcoming-jobs
   */
  async getUpcomingJobs(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const jobs = await dashboardService.getUpcomingJobs(tenantId)

      return reply.send({
        success: true,
        data: { jobs }
      })
    } catch (error) {
      logger.error({
        event: 'GET_UPCOMING_JOBS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch upcoming jobs',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get overdue jobs
   * GET /dashboard/overdue-jobs
   */
  async getOverdueJobs(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const jobs = await dashboardService.getOverdueJobs(tenantId)

      return reply.send({
        success: true,
        data: { jobs }
      })
    } catch (error) {
      logger.error({
        event: 'GET_OVERDUE_JOBS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch overdue jobs',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get staff workload
   * GET /dashboard/staff-workload
   */
  async getStaffWorkload(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const staff = await dashboardService.getStaffWorkload(tenantId)

      return reply.send({
        success: true,
        data: { staff }
      })
    } catch (error) {
      logger.error({
        event: 'GET_STAFF_WORKLOAD_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch staff workload',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get recent activity
   * GET /dashboard/recent-activity
   */
  async getRecentActivity(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { limit } = request.query

      const activities = await dashboardService.getRecentActivity(
        tenantId, 
        limit ? parseInt(limit) : 20
      )

      return reply.send({
        success: true,
        data: { activities }
      })
    } catch (error) {
      logger.error({
        event: 'GET_RECENT_ACTIVITY_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch recent activity',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get charts data (trends)
   * GET /dashboard/charts
   */
  async getCharts(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const [completionTrend, creationTrend] = await Promise.all([
        dashboardService.getCompletionTrend(tenantId),
        dashboardService.getCreationTrend(tenantId)
      ])

      return reply.send({
        success: true,
        data: {
          completionTrend,
          creationTrend
        }
      })
    } catch (error) {
      logger.error({
        event: 'GET_CHARTS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch chart data',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get top clients
   * GET /dashboard/top-clients
   */
  async getTopClients(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const clients = await dashboardService.getTopClients(tenantId)

      return reply.send({
        success: true,
        data: { clients }
      })
    } catch (error) {
      logger.error({
        event: 'GET_TOP_CLIENTS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch top clients',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get KPIs
   * GET /dashboard/kpis
   */
  async getKPIs(request, reply) {
    try {
      const tenantId = request.user.tenantId

      const kpis = await dashboardService.getKPIs(tenantId)

      return reply.send({
        success: true,
        data: kpis
      })
    } catch (error) {
      logger.error({
        event: 'GET_KPIS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch KPIs',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new DashboardController()
