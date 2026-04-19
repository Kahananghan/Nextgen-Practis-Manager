// ============================================
// src/modules/analytics/analytics.service.js
// Advanced Analytics Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')

class AnalyticsService {
  /**
   * Get trend analysis (moving averages, growth rates)
   * @param {string} tenantId - Tenant ID
   * @param {object} options - Analysis options
   * @returns {object} - Trend data
   */
  async getTrendAnalysis(tenantId, options = {}) {
    try {
      const { months = 6, metric = 'revenue' } = options

      // Job completion trend with moving average
      const completionTrend = await db.query(`
        WITH daily_completions AS (
          SELECT 
            DATE(updated_at) as date,
            COUNT(*) as completed
          FROM xpm_jobs
          WHERE tenant_id = $1 
            AND state = 'Complete'
            AND updated_at >= CURRENT_DATE - INTERVAL '${months} months'
          GROUP BY DATE(updated_at)
        ),
        moving_avg AS (
          SELECT 
            date,
            completed,
            AVG(completed) OVER (
              ORDER BY date 
              ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as ma_7day,
            AVG(completed) OVER (
              ORDER BY date 
              ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
            ) as ma_30day
          FROM daily_completions
        )
        SELECT * FROM moving_avg
        ORDER BY date DESC
        LIMIT 90
      `, [tenantId])

      // Monthly growth rate
      const monthlyGrowth = await db.query(`
        WITH monthly_stats AS (
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            COUNT(*) as jobs_created,
            COUNT(*) FILTER (WHERE state = 'Complete') as jobs_completed,
            SUM(budget) as revenue
          FROM xpm_jobs
          WHERE tenant_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '${months} months'
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ),
        with_growth AS (
          SELECT 
            month,
            jobs_created,
            jobs_completed,
            revenue,
            LAG(jobs_created) OVER (ORDER BY month) as prev_jobs,
            LAG(revenue) OVER (ORDER BY month) as prev_revenue,
            ROUND(
              ((jobs_created::numeric - LAG(jobs_created) OVER (ORDER BY month)) / 
              NULLIF(LAG(jobs_created) OVER (ORDER BY month), 0) * 100), 2
            ) as job_growth_rate,
            ROUND(
              ((revenue - LAG(revenue) OVER (ORDER BY month)) / 
              NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100), 2
            ) as revenue_growth_rate
          FROM monthly_stats
        )
        SELECT * FROM with_growth
        ORDER BY month DESC
      `, [tenantId])

      return {
        completionTrend: completionTrend.rows,
        monthlyGrowth: monthlyGrowth.rows,
        period: `${months} months`
      }
    } catch (error) {
      logger.error({
        event: 'GET_TREND_ANALYSIS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get statistical analysis
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Statistical metrics
   */
  async getStatisticalAnalysis(tenantId) {
    try {
      // Job duration statistics
      const durationStats = await db.query(`
        WITH job_durations AS (
          SELECT 
            EXTRACT(EPOCH FROM (updated_at - created_at))/86400 as duration_days
          FROM xpm_jobs
          WHERE tenant_id = $1 AND state = 'Complete'
        )
        SELECT 
          ROUND(AVG(duration_days), 2) as avg_duration,
          ROUND(STDDEV(duration_days), 2) as std_dev,
          ROUND(MIN(duration_days), 2) as min_duration,
          ROUND(MAX(duration_days), 2) as max_duration,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_days) as percentile_25,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_days) as median,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_days) as percentile_75,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY duration_days) as percentile_90,
          COUNT(*) as sample_size
        FROM job_durations
      `, [tenantId])

      // Staff productivity statistics
      const staffStats = await db.query(`
        WITH staff_performance AS (
          SELECT 
            s.id,
            s.name,
            COUNT(j.id) as total_jobs,
            COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs,
            AVG(EXTRACT(EPOCH FROM (j.updated_at - j.created_at))/86400) 
              FILTER (WHERE j.state = 'Complete') as avg_completion_days
          FROM xpm_staff s
          LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
          WHERE s.tenant_id = $1 AND s.is_active = true
          GROUP BY s.id, s.name
        )
        SELECT 
          AVG(completed_jobs) as avg_jobs_per_staff,
          STDDEV(completed_jobs) as std_dev_jobs,
          MIN(completed_jobs) as min_jobs,
          MAX(completed_jobs) as max_jobs,
          AVG(avg_completion_days) as avg_duration_across_staff,
          COUNT(*) as active_staff_count
        FROM staff_performance
      `, [tenantId])

      // Budget statistics
      const budgetStats = await db.query(`
        SELECT 
          ROUND(AVG(budget), 2) as avg_budget,
          ROUND(STDDEV(budget), 2) as std_dev_budget,
          ROUND(MIN(budget), 2) as min_budget,
          ROUND(MAX(budget), 2) as max_budget,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY budget) as median_budget,
          COUNT(*) FILTER (WHERE budget IS NOT NULL) as jobs_with_budget
        FROM xpm_jobs
        WHERE tenant_id = $1 AND budget IS NOT NULL
      `, [tenantId])

      return {
        jobDuration: durationStats.rows[0],
        staffProductivity: staffStats.rows[0],
        budget: budgetStats.rows[0]
      }
    } catch (error) {
      logger.error({
        event: 'GET_STATISTICAL_ANALYSIS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get period comparison analysis
   * @param {string} tenantId - Tenant ID
   * @param {object} options - Comparison options
   * @returns {object} - Comparison data
   */
  async getPeriodComparison(tenantId, options = {}) {
    try {
      const { type = 'month' } = options // month, quarter, year

      let currentPeriod, previousPeriod

      if (type === 'month') {
        currentPeriod = 'CURRENT_DATE - INTERVAL \'1 month\' AND CURRENT_DATE'
        previousPeriod = 'CURRENT_DATE - INTERVAL \'2 months\' AND CURRENT_DATE - INTERVAL \'1 month\''
      } else if (type === 'quarter') {
        currentPeriod = 'CURRENT_DATE - INTERVAL \'3 months\' AND CURRENT_DATE'
        previousPeriod = 'CURRENT_DATE - INTERVAL \'6 months\' AND CURRENT_DATE - INTERVAL \'3 months\''
      } else {
        currentPeriod = 'CURRENT_DATE - INTERVAL \'1 year\' AND CURRENT_DATE'
        previousPeriod = 'CURRENT_DATE - INTERVAL \'2 years\' AND CURRENT_DATE - INTERVAL \'1 year\''
      }

      const result = await db.query(`
        WITH current_period AS (
          SELECT 
            COUNT(*) as jobs_created,
            COUNT(*) FILTER (WHERE state = 'Complete') as jobs_completed,
            SUM(budget) as total_budget,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) 
              FILTER (WHERE state = 'Complete') as avg_duration
          FROM xpm_jobs
          WHERE tenant_id = $1
            AND created_at BETWEEN ${currentPeriod}
        ),
        previous_period AS (
          SELECT 
            COUNT(*) as jobs_created,
            COUNT(*) FILTER (WHERE state = 'Complete') as jobs_completed,
            SUM(budget) as total_budget,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) 
              FILTER (WHERE state = 'Complete') as avg_duration
          FROM xpm_jobs
          WHERE tenant_id = $1
            AND created_at BETWEEN ${previousPeriod}
        )
        SELECT 
          c.jobs_created as current_jobs_created,
          p.jobs_created as previous_jobs_created,
          ROUND(((c.jobs_created::numeric - p.jobs_created) / NULLIF(p.jobs_created, 0) * 100), 2) as jobs_change_pct,
          c.jobs_completed as current_jobs_completed,
          p.jobs_completed as previous_jobs_completed,
          ROUND(((c.jobs_completed::numeric - p.jobs_completed) / NULLIF(p.jobs_completed, 0) * 100), 2) as completion_change_pct,
          c.total_budget as current_budget,
          p.total_budget as previous_budget,
          ROUND(((c.total_budget - p.total_budget) / NULLIF(p.total_budget, 0) * 100), 2) as budget_change_pct,
          ROUND(c.avg_duration, 2) as current_avg_duration,
          ROUND(p.avg_duration, 2) as previous_avg_duration
        FROM current_period c, previous_period p
      `, [tenantId])

      return {
        type,
        comparison: result.rows[0]
      }
    } catch (error) {
      logger.error({
        event: 'GET_PERIOD_COMPARISON_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get performance metrics
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Performance metrics
   */
  async getPerformanceMetrics(tenantId) {
    try {
      // Overall efficiency metrics
      const efficiency = await db.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE state = 'Complete') as completed_jobs,
          ROUND((COUNT(*) FILTER (WHERE state = 'Complete')::numeric / NULLIF(COUNT(*), 0) * 100), 2) as completion_rate,
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND state != 'Complete') as overdue_jobs,
          ROUND((COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND state != 'Complete')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE state != 'Complete'), 0) * 100), 2) as overdue_rate,
          COUNT(*) FILTER (WHERE state = 'Complete' AND updated_at <= due_date) as on_time_completions,
          ROUND((COUNT(*) FILTER (WHERE state = 'Complete' AND updated_at <= due_date)::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE state = 'Complete'), 0) * 100), 2) as on_time_rate
        FROM xpm_jobs
        WHERE tenant_id = $1
      `, [tenantId])

      // Staff utilization
      const utilization = await db.query(`
        WITH staff_workload AS (
          SELECT 
            COUNT(DISTINCT s.id) as total_staff,
            COUNT(DISTINCT CASE WHEN j.id IS NOT NULL THEN s.id END) as staff_with_jobs,
            SUM(CASE WHEN j.state = 'In Progress' THEN 1 ELSE 0 END) as active_jobs,
            COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true) as active_staff
          FROM xpm_staff s
          LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
          WHERE s.tenant_id = $1
        )
        SELECT 
          total_staff,
          staff_with_jobs,
          active_jobs,
          active_staff,
          ROUND((staff_with_jobs::numeric / NULLIF(active_staff, 0) * 100), 2) as utilization_rate,
          ROUND((active_jobs::numeric / NULLIF(active_staff, 0)), 2) as avg_jobs_per_staff
        FROM staff_workload
      `, [tenantId])

      // Client engagement
      const clientMetrics = await db.query(`
        WITH client_activity AS (
          SELECT 
            COUNT(DISTINCT c.id) as total_clients,
            COUNT(DISTINCT CASE WHEN j.id IS NOT NULL THEN c.id END) as clients_with_jobs,
            COUNT(j.id) as total_jobs,
            SUM(j.budget) as total_revenue
          FROM xpm_clients c
          LEFT JOIN xpm_jobs j ON c.id = j.client_id
          WHERE c.tenant_id = $1 AND c.is_archived = false
        )
        SELECT 
          total_clients,
          clients_with_jobs,
          total_jobs,
          total_revenue,
          ROUND((clients_with_jobs::numeric / NULLIF(total_clients, 0) * 100), 2) as engagement_rate,
          ROUND((total_jobs::numeric / NULLIF(clients_with_jobs, 0)), 2) as avg_jobs_per_client,
          ROUND((total_revenue / NULLIF(clients_with_jobs, 0)), 2) as avg_revenue_per_client
        FROM client_activity
      `, [tenantId])

      return {
        efficiency: efficiency.rows[0],
        staffUtilization: utilization.rows[0],
        clientEngagement: clientMetrics.rows[0]
      }
    } catch (error) {
      logger.error({
        event: 'GET_PERFORMANCE_METRICS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Detect anomalies (SQL-based threshold detection)
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Detected anomalies
   */
  async detectAnomalies(tenantId) {
    try {
      const anomalies = []

      // Jobs taking significantly longer than average
      const slowJobs = await db.query(`
        WITH avg_duration AS (
          SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days
          FROM xpm_jobs
          WHERE tenant_id = $1 AND state = 'Complete'
        ),
        slow_jobs AS (
          SELECT 
            j.id,
            j.name,
            j.xpm_job_number,
            EXTRACT(EPOCH FROM (CURRENT_DATE - j.created_at))/86400 as current_duration,
            a.avg_days
          FROM xpm_jobs j, avg_duration a
          WHERE j.tenant_id = $1 
            AND j.state IN ('In Progress', 'Planned')
            AND EXTRACT(EPOCH FROM (CURRENT_DATE - j.created_at))/86400 > (a.avg_days * 2)
        )
        SELECT * FROM slow_jobs
        LIMIT 10
      `, [tenantId])

      if (slowJobs.rows.length > 0) {
        anomalies.push({
          type: 'slow_jobs',
          severity: 'high',
          count: slowJobs.rows.length,
          message: `${slowJobs.rows.length} jobs taking 2x longer than average`,
          jobs: slowJobs.rows
        })
      }

      // Staff with unusually high overdue rate
      const overdueStaff = await db.query(`
        WITH staff_overdue AS (
          SELECT 
            s.id,
            s.name,
            COUNT(j.id) as total_jobs,
            COUNT(j.id) FILTER (WHERE j.due_date < CURRENT_DATE AND j.state != 'Complete') as overdue_jobs,
            ROUND((COUNT(j.id) FILTER (WHERE j.due_date < CURRENT_DATE AND j.state != 'Complete')::numeric / 
              NULLIF(COUNT(j.id), 0) * 100), 2) as overdue_rate
          FROM xpm_staff s
          LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
          WHERE s.tenant_id = $1 AND s.is_active = true
          GROUP BY s.id, s.name
          HAVING COUNT(j.id) > 0
        )
        SELECT * FROM staff_overdue
        WHERE overdue_rate > 30
        ORDER BY overdue_rate DESC
        LIMIT 5
      `, [tenantId])

      if (overdueStaff.rows.length > 0) {
        anomalies.push({
          type: 'high_overdue_staff',
          severity: 'medium',
          count: overdueStaff.rows.length,
          message: `${overdueStaff.rows.length} staff members with >30% overdue rate`,
          staff: overdueStaff.rows
        })
      }

      // Sudden spike in job creation (last 7 days vs previous 7 days)
      const jobSpike = await db.query(`
        WITH recent_week AS (
          SELECT COUNT(*) as count
          FROM xpm_jobs
          WHERE tenant_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        ),
        previous_week AS (
          SELECT COUNT(*) as count
          FROM xpm_jobs
          WHERE tenant_id = $1
            AND created_at BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days'
        )
        SELECT 
          r.count as recent_count,
          p.count as previous_count,
          ROUND(((r.count::numeric - p.count) / NULLIF(p.count, 0) * 100), 2) as change_pct
        FROM recent_week r, previous_week p
      `, [tenantId])

      if (jobSpike.rows[0].change_pct > 50) {
        anomalies.push({
          type: 'job_creation_spike',
          severity: 'low',
          message: `Job creation increased by ${jobSpike.rows[0].change_pct}% this week`,
          data: jobSpike.rows[0]
        })
      }

      return anomalies
    } catch (error) {
      logger.error({
        event: 'DETECT_ANOMALIES_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get multi-dimensional analysis
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Multi-dimensional data
   */
  async getMultiDimensionalAnalysis(tenantId) {
    try {
      // Jobs by client and state
      const byClientState = await db.query(`
        SELECT 
          c.name as client_name,
          j.state,
          COUNT(*) as job_count,
          SUM(j.budget) as total_budget
        FROM xpm_jobs j
        JOIN xpm_clients c ON j.client_id = c.id
        WHERE j.tenant_id = $1
        GROUP BY c.name, j.state
        ORDER BY c.name, j.state
      `, [tenantId])

      // Jobs by priority and category
      const byPriorityCategory = await db.query(`
        SELECT 
          priority,
          category,
          COUNT(*) as job_count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) 
            FILTER (WHERE state = 'Complete') as avg_duration
        FROM xpm_jobs
        WHERE tenant_id = $1
        GROUP BY priority, category
        ORDER BY priority, category
      `, [tenantId])

      // Staff performance by job type
      const byStaffJobType = await db.query(`
        SELECT 
          s.name as staff_name,
          j.job_type,
          COUNT(*) as jobs_handled,
          AVG(EXTRACT(EPOCH FROM (j.updated_at - j.created_at))/86400) 
            FILTER (WHERE j.state = 'Complete') as avg_completion_days
        FROM xpm_staff s
        JOIN xpm_jobs j ON s.id = j.assigned_staff_id
        WHERE s.tenant_id = $1
        GROUP BY s.name, j.job_type
        ORDER BY s.name, jobs_handled DESC
      `, [tenantId])

      return {
        byClientState: byClientState.rows,
        byPriorityCategory: byPriorityCategory.rows,
        byStaffJobType: byStaffJobType.rows
      }
    } catch (error) {
      logger.error({
        event: 'GET_MULTI_DIMENSIONAL_ANALYSIS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }
}

module.exports = new AnalyticsService()
