// ============================================
// src/modules/dashboard/dashboard.service.js
// Dashboard Analytics & Statistics Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')

class DashboardService {
  /**
   * Get dashboard overview statistics
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Overview stats
   */
  async getOverview(tenantId) {
    try {
      const stats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1) as total_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND state = 'In Progress') as active_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND state = 'Complete') as completed_jobs,
          (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1 AND due_date < CURRENT_DATE AND state != 'Complete') as overdue_jobs,
          (SELECT COUNT(*) FROM xpm_clients WHERE tenant_id = $1 AND is_archived = false) as active_clients,
          (SELECT COUNT(*) FROM xpm_staff WHERE tenant_id = $1 AND is_active = true) as active_staff,
          (SELECT COUNT(*) FROM xpm_tasks WHERE tenant_id = $1) as total_tasks,
          (SELECT COUNT(*) FROM xpm_tasks WHERE tenant_id = $1 AND is_completed = true) as completed_tasks
      `, [tenantId])

      const overview = stats.rows[0]

      // Calculate percentages
      const jobCompletionRate = overview.total_jobs > 0 
        ? Math.round((overview.completed_jobs / overview.total_jobs) * 100) 
        : 0

      const taskCompletionRate = overview.total_tasks > 0
        ? Math.round((overview.completed_tasks / overview.total_tasks) * 100)
        : 0

      return {
        jobs: {
          total: parseInt(overview.total_jobs),
          active: parseInt(overview.active_jobs),
          completed: parseInt(overview.completed_jobs),
          overdue: parseInt(overview.overdue_jobs),
          completionRate: jobCompletionRate
        },
        clients: {
          active: parseInt(overview.active_clients)
        },
        staff: {
          active: parseInt(overview.active_staff)
        },
        tasks: {
          total: parseInt(overview.total_tasks),
          completed: parseInt(overview.completed_tasks),
          completionRate: taskCompletionRate
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_OVERVIEW_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get job statistics by state
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Job stats by state
   */
  async getJobsByState(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          state,
          COUNT(*) as count
        FROM xpm_jobs
        WHERE tenant_id = $1
        GROUP BY state
        ORDER BY 
          CASE state
            WHEN 'In Progress' THEN 1
            WHEN 'Planned' THEN 2
            WHEN 'On Hold' THEN 3
            WHEN 'Complete' THEN 4
          END
      `, [tenantId])

      return result.rows.map(row => ({
        state: row.state,
        count: parseInt(row.count)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_BY_STATE_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get jobs by priority
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Job stats by priority
   */
  async getJobsByPriority(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          priority,
          COUNT(*) as count
        FROM xpm_jobs
        WHERE tenant_id = $1 AND state != 'Complete'
        GROUP BY priority
        ORDER BY 
          CASE priority
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Normal' THEN 3
            WHEN 'Low' THEN 4
          END
      `, [tenantId])

      return result.rows.map(row => ({
        priority: row.priority,
        count: parseInt(row.count)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_BY_PRIORITY_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get upcoming jobs (due in next 7 days)
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Upcoming jobs
   */
  async getUpcomingJobs(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          j.id,
          j.name,
          j.xpm_job_number as job_number,
          j.due_date,
          j.state,
          j.priority,
          c.name as client_name,
          s.name as assigned_staff
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        WHERE j.tenant_id = $1
          AND j.state != 'Complete'
          AND j.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        ORDER BY j.due_date ASC
        LIMIT 10
      `, [tenantId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        jobNumber: row.job_number,
        dueDate: row.due_date,
        state: row.state,
        priority: row.priority,
        clientName: row.client_name,
        assignedStaff: row.assigned_staff
      }))
    } catch (error) {
      logger.error({
        event: 'GET_UPCOMING_JOBS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get overdue jobs
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Overdue jobs
   */
  async getOverdueJobs(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          j.id,
          j.name,
          j.xpm_job_number as job_number,
          j.due_date,
          j.state,
          j.priority,
          c.name as client_name,
          s.name as assigned_staff,
          CURRENT_DATE - j.due_date as days_overdue
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        WHERE j.tenant_id = $1
          AND j.state != 'Complete'
          AND j.due_date < CURRENT_DATE
        ORDER BY j.due_date ASC
        LIMIT 10
      `, [tenantId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        jobNumber: row.job_number,
        dueDate: row.due_date,
        state: row.state,
        priority: row.priority,
        clientName: row.client_name,
        assignedStaff: row.assigned_staff,
        daysOverdue: parseInt(row.days_overdue)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_OVERDUE_JOBS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get staff workload
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Staff workload stats
   */
  async getStaffWorkload(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          s.id,
          s.name,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          COUNT(j.id) FILTER (WHERE j.state != 'Complete') as total_assigned,
          COUNT(j.id) FILTER (WHERE j.due_date < CURRENT_DATE AND j.state != 'Complete') as overdue_jobs
        FROM xpm_staff s
        LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id AND j.tenant_id = $1
        WHERE s.tenant_id = $1 AND s.is_active = true
        GROUP BY s.id, s.name
        ORDER BY active_jobs DESC, total_assigned DESC
        LIMIT 10
      `, [tenantId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        activeJobs: parseInt(row.active_jobs),
        totalAssigned: parseInt(row.total_assigned),
        overdueJobs: parseInt(row.overdue_jobs)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_STAFF_WORKLOAD_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get recent activity
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Number of activities
   * @returns {Array} - Recent activities
   */
  async getRecentActivity(tenantId, limit = 20) {
    try {
      const result = await db.query(`
        SELECT 
          'job_created' as type,
          j.name as title,
          j.created_at as timestamp,
          c.name as related_entity
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        WHERE j.tenant_id = $1
        ORDER BY j.created_at DESC
        LIMIT $2
      `, [tenantId, limit])

      return result.rows.map(row => ({
        type: row.type,
        title: row.title,
        timestamp: row.timestamp,
        relatedEntity: row.related_entity
      }))
    } catch (error) {
      logger.error({
        event: 'GET_RECENT_ACTIVITY_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get jobs completion trend (last 30 days)
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Daily completion data
   */
  async getCompletionTrend(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          DATE(updated_at) as date,
          COUNT(*) as completed
        FROM xpm_jobs
        WHERE tenant_id = $1
          AND state = 'Complete'
          AND updated_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(updated_at)
        ORDER BY date ASC
      `, [tenantId])

      return result.rows.map(row => ({
        date: row.date,
        completed: parseInt(row.completed)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_COMPLETION_TREND_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get job creation trend (last 30 days)
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Daily creation data
   */
  async getCreationTrend(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as created
        FROM xpm_jobs
        WHERE tenant_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [tenantId])

      return result.rows.map(row => ({
        date: row.date,
        created: parseInt(row.created)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_CREATION_TREND_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get top clients by job count
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Top clients
   */
  async getTopClients(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          c.id,
          c.name,
          COUNT(j.id) as job_count,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs
        FROM xpm_clients c
        LEFT JOIN xpm_jobs j ON c.id = j.client_id
        WHERE c.tenant_id = $1 AND c.is_archived = false
        GROUP BY c.id, c.name
        HAVING COUNT(j.id) > 0
        ORDER BY job_count DESC
        LIMIT 10
      `, [tenantId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        totalJobs: parseInt(row.job_count),
        activeJobs: parseInt(row.active_jobs),
        completedJobs: parseInt(row.completed_jobs)
      }))
    } catch (error) {
      logger.error({
        event: 'GET_TOP_CLIENTS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get KPIs (Key Performance Indicators)
   * @param {string} tenantId - Tenant ID
   * @returns {object} - KPI metrics
   */
  async getKPIs(tenantId) {
    try {
      const result = await db.query(`
        SELECT
          -- Completion rate
          CASE 
            WHEN COUNT(*) > 0 THEN
              ROUND((COUNT(*) FILTER (WHERE state = 'Complete')::numeric / COUNT(*)::numeric) * 100, 1)
            ELSE 0
          END as completion_rate,
          
          -- On-time completion rate
          CASE
            WHEN COUNT(*) FILTER (WHERE state = 'Complete') > 0 THEN
              ROUND((COUNT(*) FILTER (WHERE state = 'Complete' AND updated_at <= due_date)::numeric / 
                     COUNT(*) FILTER (WHERE state = 'Complete')::numeric) * 100, 1)
            ELSE 0
          END as on_time_rate,
          
          -- Average job duration (in days)
          ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400), 1) 
            FILTER (WHERE state = 'Complete') as avg_duration_days,
          
          -- Active jobs per staff
          CASE
            WHEN (SELECT COUNT(*) FROM xpm_staff WHERE tenant_id = $1 AND is_active = true) > 0 THEN
              ROUND(COUNT(*) FILTER (WHERE state = 'In Progress')::numeric / 
                    (SELECT COUNT(*) FROM xpm_staff WHERE tenant_id = $1 AND is_active = true)::numeric, 1)
            ELSE 0
          END as jobs_per_staff
          
        FROM xpm_jobs
        WHERE tenant_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      `, [tenantId])

      const kpis = result.rows[0]

      return {
        completionRate: parseFloat(kpis.completion_rate),
        onTimeRate: parseFloat(kpis.on_time_rate),
        avgDurationDays: parseFloat(kpis.avg_duration_days) || 0,
        jobsPerStaff: parseFloat(kpis.jobs_per_staff)
      }
    } catch (error) {
      logger.error({
        event: 'GET_KPIS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }
}

module.exports = new DashboardService()
