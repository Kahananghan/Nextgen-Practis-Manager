// ============================================
// src/modules/reports/reports.service.js
// Reports Generation Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')

class ReportsService {
  /**
   * Generate jobs summary report
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Date range, etc.
   * @returns {object} - Jobs report data
   */
  async generateJobsReport(tenantId, filters = {}) {
    try {
      const { startDate, endDate } = filters
      const params = [tenantId]
      let whereClause = 'WHERE j.tenant_id = $1'
      let idx = 2

      if (startDate) {
        whereClause += ` AND j.created_at >= $${idx}`
        params.push(startDate)
        idx++
      }
      if (endDate) {
        whereClause += ` AND j.created_at <= $${idx}`
        params.push(endDate)
        idx++
      }

      // Summary stats
      const summaryResult = await db.query(`
        SELECT
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE state = 'Complete') as completed_jobs,
          COUNT(*) FILTER (WHERE state = 'In Progress') as in_progress_jobs,
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND state != 'Complete') as overdue_jobs,
          ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) FILTER (WHERE state = 'Complete'), 1) as avg_completion_days,
          SUM(budget) as total_budget
        FROM xpm_jobs j
        ${whereClause}
      `, params)

      // Jobs by state
      const byStateResult = await db.query(`
        SELECT state, COUNT(*) as count
        FROM xpm_jobs j
        ${whereClause}
        GROUP BY state
      `, params)

      // Jobs by priority
      const byPriorityResult = await db.query(`
        SELECT priority, COUNT(*) as count
        FROM xpm_jobs j
        ${whereClause}
        GROUP BY priority
      `, params)

      // Top clients
      const topClientsResult = await db.query(`
        SELECT 
          c.name,
          COUNT(j.id) as job_count
        FROM xpm_jobs j
        JOIN xpm_clients c ON j.client_id = c.id
        ${whereClause}
        GROUP BY c.name
        ORDER BY job_count DESC
        LIMIT 10
      `, params)

      return {
        summary: summaryResult.rows[0],
        byState: byStateResult.rows,
        byPriority: byPriorityResult.rows,
        topClients: topClientsResult.rows,
        filters: { startDate, endDate }
      }
    } catch (error) {
      logger.error({
        event: 'GENERATE_JOBS_REPORT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Generate client activity report
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filters
   * @returns {object} - Client report data
   */
  async generateClientReport(tenantId, filters = {}) {
    try {
      const { startDate, endDate } = filters

      // Client summary
      const summaryResult = await db.query(`
        SELECT
          COUNT(*) as total_clients,
          COUNT(*) FILTER (WHERE is_archived = false) as active_clients,
          COUNT(*) FILTER (WHERE is_archived = true) as archived_clients
        FROM xpm_clients
        WHERE tenant_id = $1
      `, [tenantId])

      // Clients with job counts
      const clientsResult = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(j.id) as total_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          SUM(j.budget) as total_budget
        FROM xpm_clients c
        LEFT JOIN xpm_jobs j ON c.id = j.client_id
        WHERE c.tenant_id = $1
        GROUP BY c.id, c.name, c.email
        ORDER BY total_jobs DESC
        LIMIT 50
      `, [tenantId])

      // Clients with no jobs
      const inactiveResult = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_clients c
        LEFT JOIN xpm_jobs j ON c.id = j.client_id
        WHERE c.tenant_id = $1 AND j.id IS NULL
      `, [tenantId])

      return {
        summary: summaryResult.rows[0],
        clients: clientsResult.rows,
        inactiveCount: inactiveResult.rows[0].count,
        filters: { startDate, endDate }
      }
    } catch (error) {
      logger.error({
        event: 'GENERATE_CLIENT_REPORT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Generate staff performance report
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filters
   * @returns {object} - Staff report data
   */
  async generateStaffReport(tenantId, filters = {}) {
    try {
      const { startDate, endDate } = filters

      // Staff summary
      const summaryResult = await db.query(`
        SELECT
          COUNT(*) as total_staff,
          COUNT(*) FILTER (WHERE is_active = true) as active_staff
        FROM xpm_staff
        WHERE tenant_id = $1
      `, [tenantId])

      // Staff performance
      const staffResult = await db.query(`
        SELECT 
          s.id,
          s.name,
          s.email,
          s.role,
          COUNT(j.id) as total_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          COUNT(j.id) FILTER (WHERE j.due_date < CURRENT_DATE AND j.state != 'Complete') as overdue_jobs,
          ROUND(AVG(EXTRACT(EPOCH FROM (j.updated_at - j.created_at))/86400) 
            FILTER (WHERE j.state = 'Complete'), 1) as avg_completion_days
        FROM xpm_staff s
        LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
        WHERE s.tenant_id = $1 AND s.is_active = true
        GROUP BY s.id, s.name, s.email, s.role
        ORDER BY completed_jobs DESC
      `, [tenantId])

      // Workload distribution
      const workloadResult = await db.query(`
        SELECT 
          CASE 
            WHEN job_count = 0 THEN '0 jobs'
            WHEN job_count <= 5 THEN '1-5 jobs'
            WHEN job_count <= 10 THEN '6-10 jobs'
            WHEN job_count <= 20 THEN '11-20 jobs'
            ELSE '20+ jobs'
          END as workload_range,
          COUNT(*) as staff_count
        FROM (
          SELECT s.id, COUNT(j.id) as job_count
          FROM xpm_staff s
          LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id AND j.state = 'In Progress'
          WHERE s.tenant_id = $1 AND s.is_active = true
          GROUP BY s.id
        ) workload
        GROUP BY workload_range
        ORDER BY workload_range
      `, [tenantId])

      return {
        summary: summaryResult.rows[0],
        staff: staffResult.rows,
        workloadDistribution: workloadResult.rows,
        filters: { startDate, endDate }
      }
    } catch (error) {
      logger.error({
        event: 'GENERATE_STAFF_REPORT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Generate financial summary report
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filters
   * @returns {object} - Financial report data
   */
  async generateFinancialReport(tenantId, filters = {}) {
    try {
      const { startDate, endDate } = filters
      const params = [tenantId]
      let whereClause = 'WHERE j.tenant_id = $1'
      let idx = 2

      if (startDate) {
        whereClause += ` AND j.created_at >= $${idx}`
        params.push(startDate)
        idx++
      }
      if (endDate) {
        whereClause += ` AND j.created_at <= $${idx}`
        params.push(endDate)
        idx++
      }

      // Budget summary
      const summaryResult = await db.query(`
        SELECT
          COUNT(*) as total_jobs,
          SUM(budget) as total_budget,
          AVG(budget) as avg_budget,
          SUM(budget) FILTER (WHERE state = 'Complete') as completed_budget
        FROM xpm_jobs j
        ${whereClause}
      `, params)

      // Budget by client
      const byClientResult = await db.query(`
        SELECT 
          c.name as client_name,
          COUNT(j.id) as job_count,
          SUM(j.budget) as total_budget
        FROM xpm_jobs j
        JOIN xpm_clients c ON j.client_id = c.id
        ${whereClause}
        GROUP BY c.name
        ORDER BY total_budget DESC NULLS LAST
        LIMIT 10
      `, params)

      // Budget by category
      const byCategoryResult = await db.query(`
        SELECT 
          category,
          COUNT(*) as job_count,
          SUM(budget) as total_budget
        FROM xpm_jobs j
        ${whereClause}
        GROUP BY category
        ORDER BY total_budget DESC NULLS LAST
      `, params)

      // Monthly trend (last 6 months)
      const trendResult = await db.query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as jobs_created,
          SUM(budget) as budget
        FROM xpm_jobs j
        WHERE j.tenant_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `, [tenantId])

      return {
        summary: summaryResult.rows[0],
        byClient: byClientResult.rows,
        byCategory: byCategoryResult.rows,
        monthlyTrend: trendResult.rows,
        filters: { startDate, endDate }
      }
    } catch (error) {
      logger.error({
        event: 'GENERATE_FINANCIAL_REPORT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Generate overview/dashboard report
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Overview data
   */
  async generateOverviewReport(tenantId) {
    try {
      // Quick stats
      const statsResult = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1) as total_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND state = 'In Progress') as active_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND state = 'Complete') as completed_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND due_date < CURRENT_DATE AND state != 'Complete') as overdue_jobs,
          (SELECT COUNT(*) FROM xpm_clients WHERE tenant_id = $1 AND is_archived = false) as active_clients,
          (SELECT COUNT(*) FROM xpm_staff WHERE tenant_id = $1 AND is_active = true) as active_staff,
          (SELECT SUM(budget) FROM xpm_jobs WHERE tenant_id = $1) as total_budget
      `, [tenantId])

      // Recent activity (last 30 days)
      const activityResult = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as jobs_created
        FROM xpm_jobs
        WHERE tenant_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [tenantId])

      return {
        stats: statsResult.rows[0],
        recentActivity: activityResult.rows
      }
    } catch (error) {
      logger.error({
        event: 'GENERATE_OVERVIEW_REPORT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Format report data for export (CSV-friendly)
   * @param {object} reportData - Report data
   * @param {string} reportType - Type of report
   * @returns {Array} - Formatted rows
   */
  formatForExport(reportData, reportType) {
    switch (reportType) {
      case 'jobs':
        return this._formatJobsForExport(reportData)
      case 'clients':
        return this._formatClientsForExport(reportData)
      case 'staff':
        return this._formatStaffForExport(reportData)
      case 'financial':
        return this._formatFinancialForExport(reportData)
      default:
        return []
    }
  }

  _formatJobsForExport(data) {
    const rows = []
    rows.push(['Jobs Report', ''])
    rows.push(['Total Jobs', data.summary.total_jobs])
    rows.push(['Completed', data.summary.completed_jobs])
    rows.push(['In Progress', data.summary.in_progress_jobs])
    rows.push(['Overdue', data.summary.overdue_jobs])
    rows.push([])
    rows.push(['Top Clients'])
    rows.push(['Client Name', 'Job Count'])
    data.topClients.forEach(c => rows.push([c.name, c.job_count]))
    return rows
  }

  _formatClientsForExport(data) {
    const rows = []
    rows.push(['Client Report', ''])
    rows.push(['Total Clients', data.summary.total_clients])
    rows.push(['Active', data.summary.active_clients])
    rows.push([])
    rows.push(['Client Name', 'Email', 'Total Jobs', 'Active Jobs', 'Completed Jobs'])
    data.clients.forEach(c => rows.push([
      c.name, c.email, c.total_jobs, c.active_jobs, c.completed_jobs
    ]))
    return rows
  }

  _formatStaffForExport(data) {
    const rows = []
    rows.push(['Staff Performance Report', ''])
    rows.push(['Total Staff', data.summary.total_staff])
    rows.push([])
    rows.push(['Name', 'Email', 'Role', 'Total Jobs', 'Active', 'Completed', 'Overdue'])
    data.staff.forEach(s => rows.push([
      s.name, s.email, s.role, s.total_jobs, s.active_jobs, s.completed_jobs, s.overdue_jobs
    ]))
    return rows
  }

  _formatFinancialForExport(data) {
    const rows = []
    rows.push(['Financial Report', ''])
    rows.push(['Total Budget', data.summary.total_budget])
    rows.push(['Average Budget', data.summary.avg_budget])
    rows.push([])
    rows.push(['Client', 'Jobs', 'Total Budget'])
    data.byClient.forEach(c => rows.push([c.client_name, c.job_count, c.total_budget]))
    return rows
  }
}

module.exports = new ReportsService()
