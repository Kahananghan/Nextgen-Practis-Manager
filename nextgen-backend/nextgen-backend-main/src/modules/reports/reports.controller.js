// ============================================
// src/modules/reports/reports.controller.js
// ============================================
const reportsService = require('./reports.service')
const logger = require('../../utils/logger')

class ReportsController {
  async generateJobsReport(request, reply) {
    try {
      const report = await reportsService.generateJobsReport(request.user.tenantId, request.query)
      return reply.send({ success: true, data: report })
    } catch (error) {
      logger.error({ event: 'GENERATE_JOBS_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate jobs report', statusCode: 500 } })
    }
  }

  async generateClientReport(request, reply) {
    try {
      const report = await reportsService.generateClientReport(request.user.tenantId, request.query)
      return reply.send({ success: true, data: report })
    } catch (error) {
      logger.error({ event: 'GENERATE_CLIENT_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate client report', statusCode: 500 } })
    }
  }

  async generateStaffReport(request, reply) {
    try {
      const report = await reportsService.generateStaffReport(request.user.tenantId, request.query)
      return reply.send({ success: true, data: report })
    } catch (error) {
      logger.error({ event: 'GENERATE_STAFF_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate staff report', statusCode: 500 } })
    }
  }

  async generateFinancialReport(request, reply) {
    try {
      const report = await reportsService.generateFinancialReport(request.user.tenantId, request.query)
      return reply.send({ success: true, data: report })
    } catch (error) {
      logger.error({ event: 'GENERATE_FINANCIAL_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate financial report', statusCode: 500 } })
    }
  }

  async generateOverviewReport(request, reply) {
    try {
      const report = await reportsService.generateOverviewReport(request.user.tenantId)
      return reply.send({ success: true, data: report })
    } catch (error) {
      logger.error({ event: 'GENERATE_OVERVIEW_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate overview report', statusCode: 500 } })
    }
  }

  async exportReport(request, reply) {
    try {
      const { type } = request.params
      const { format = 'json' } = request.query
      
      let reportData
      switch (type) {
        case 'jobs':
          reportData = await reportsService.generateJobsReport(request.user.tenantId, request.query)
          break
        case 'clients':
          reportData = await reportsService.generateClientReport(request.user.tenantId, request.query)
          break
        case 'staff':
          reportData = await reportsService.generateStaffReport(request.user.tenantId, request.query)
          break
        case 'financial':
          reportData = await reportsService.generateFinancialReport(request.user.tenantId, request.query)
          break
        default:
          return reply.code(400).send({ success: false, error: { message: 'Invalid report type' } })
      }

      if (format === 'csv') {
        const rows = reportsService.formatForExport(reportData, type)
        const csv = rows.map(row => row.join(',')).join('\n')
        
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', `attachment; filename="${type}-report.csv"`)
        return reply.send(csv)
      }

      // Default JSON
      return reply.send({ success: true, data: reportData })
    } catch (error) {
      logger.error({ event: 'EXPORT_REPORT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to export report', statusCode: 500 } })
    }
  }
}

module.exports = new ReportsController()
