// ============================================
// src/modules/analytics/analytics.controller.js
// ============================================
const analyticsService = require('./analytics.service')
const logger = require('../../utils/logger')

class AnalyticsController {
  async getTrendAnalysis(request, reply) {
    try {
      const data = await analyticsService.getTrendAnalysis(request.user.tenantId, request.query)
      return reply.send({ success: true, data })
    } catch (error) {
      logger.error({ event: 'GET_TREND_ANALYSIS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate trend analysis', statusCode: 500 } })
    }
  }

  async getStatisticalAnalysis(request, reply) {
    try {
      const data = await analyticsService.getStatisticalAnalysis(request.user.tenantId)
      return reply.send({ success: true, data })
    } catch (error) {
      logger.error({ event: 'GET_STATISTICAL_ANALYSIS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate statistical analysis', statusCode: 500 } })
    }
  }

  async getPeriodComparison(request, reply) {
    try {
      const data = await analyticsService.getPeriodComparison(request.user.tenantId, request.query)
      return reply.send({ success: true, data })
    } catch (error) {
      logger.error({ event: 'GET_PERIOD_COMPARISON_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate period comparison', statusCode: 500 } })
    }
  }

  async getPerformanceMetrics(request, reply) {
    try {
      const data = await analyticsService.getPerformanceMetrics(request.user.tenantId)
      return reply.send({ success: true, data })
    } catch (error) {
      logger.error({ event: 'GET_PERFORMANCE_METRICS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate performance metrics', statusCode: 500 } })
    }
  }

  async detectAnomalies(request, reply) {
    try {
      const anomalies = await analyticsService.detectAnomalies(request.user.tenantId)
      return reply.send({ success: true, data: { anomalies, count: anomalies.length } })
    } catch (error) {
      logger.error({ event: 'DETECT_ANOMALIES_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to detect anomalies', statusCode: 500 } })
    }
  }

  async getMultiDimensionalAnalysis(request, reply) {
    try {
      const data = await analyticsService.getMultiDimensionalAnalysis(request.user.tenantId)
      return reply.send({ success: true, data })
    } catch (error) {
      logger.error({ event: 'GET_MULTI_DIMENSIONAL_ANALYSIS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate multi-dimensional analysis', statusCode: 500 } })
    }
  }
}

module.exports = new AnalyticsController()
