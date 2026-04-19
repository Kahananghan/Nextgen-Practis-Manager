// ============================================
// src/modules/timeTracking/timeTracking.service.js
// Time Tracking Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')

class TimeTrackingService {
  /**
   * Get time entries for a job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {array} - Time entries
   */
  async getTimeEntries(jobId, tenantId, filters = {}) {
    try {
      const { userId, startDate, endDate } = filters

      let whereClause = 'WHERE te.tenant_id = $1 AND te.job_id = $2'
      const params = [tenantId, jobId]
      let paramIndex = 3

      if (userId) {
        whereClause += ` AND te.user_id = $${paramIndex}`
        params.push(userId)
        paramIndex++
      }

      if (startDate) {
        whereClause += ` AND te.entry_date >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        whereClause += ` AND te.entry_date <= $${paramIndex}`
        params.push(endDate)
        paramIndex++
      }

      const result = await db.query(`
        SELECT 
          te.id,
          te.task_name,
          te.description,
          te.duration_minutes,
          te.entry_date,
          te.type,
          te.is_timer_entry,
          te.is_completed,
          te.completed_at,
          te.created_at,
          u.name as staff_name,
          u.id as user_id
        FROM time_entries te
        JOIN users u ON te.user_id = u.id
        ${whereClause}
        ORDER BY te.entry_date DESC, te.created_at DESC
      `, params)

      // Format duration for display
      const entries = result.rows.map(row => ({
        ...row,
        duration_formatted: this.formatDuration(row.duration_minutes)
      }))

      return entries
    } catch (error) {
      logger.error({ event: 'GET_TIME_ENTRIES_ERROR', jobId, tenantId, error: error.message })
      throw error
    }
  }

  /**
   * Log time entry (manual or timer)
   * @param {object} data - Time entry data
   * @returns {object} - Created time entry
   */
  async logTimeEntry({ tenantId, jobId, userId, taskName, description, durationMinutes, entryDate, type = 'Billable', isTimerEntry = false }) {
    try {
      // Validate required fields
      if (!taskName || !durationMinutes || durationMinutes <= 0) {
        throw new ValidationError('Task name and valid duration are required')
      }

      // Verify job exists and belongs to tenant
      const jobCheck = await db.query(
        'SELECT id FROM xpm_jobs WHERE id = $1 AND tenant_id = $2',
        [jobId, tenantId]
      )
      if (jobCheck.rows.length === 0) {
        throw new NotFoundError('Job not found')
      }

      const result = await db.query(`
        INSERT INTO time_entries (
          tenant_id, job_id, user_id, task_name, description,
          duration_minutes, entry_date, type, is_timer_entry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [tenantId, jobId, userId, taskName, description, durationMinutes, entryDate, type, isTimerEntry])

      logger.info({
        event: 'TIME_ENTRY_CREATED',
        entryId: result.rows[0].id,
        jobId,
        userId,
        durationMinutes,
        type
      })

      return result.rows[0]
    } catch (error) {
      logger.error({ event: 'LOG_TIME_ERROR', jobId, userId, error: error.message })
      throw error
    }
  }

  /**
   * Mark task/time entry as completed
   * @param {string} entryId - Time entry ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (for verification)
   * @returns {object} - Updated time entry
   */
  async markCompleted(entryId, tenantId, userId) {
    try {
      // Verify entry exists and belongs to user/tenant
      const checkResult = await db.query(
        'SELECT id, user_id FROM time_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, tenantId]
      )

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Time entry not found')
      }

      // Only allow user to complete their own entries (or admin can override)
      if (checkResult.rows[0].user_id !== userId) {
        throw new ValidationError('Can only complete your own time entries')
      }

      const result = await db.query(`
        UPDATE time_entries 
        SET is_completed = true, completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [entryId, tenantId])

      logger.info({
        event: 'TIME_ENTRY_COMPLETED',
        entryId,
        userId
      })

      return result.rows[0]
    } catch (error) {
      logger.error({ event: 'MARK_COMPLETED_ERROR', entryId, error: error.message })
      throw error
    }
  }

  /**
   * Delete time entry
   * @param {string} entryId - Time entry ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   */
  async deleteTimeEntry(entryId, tenantId, userId) {
    try {
      // Verify entry exists and belongs to user
      const checkResult = await db.query(
        'SELECT id, user_id FROM time_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, tenantId]
      )

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Time entry not found')
      }

      if (checkResult.rows[0].user_id !== userId) {
        throw new ValidationError('Can only delete your own time entries')
      }

      await db.query(
        'DELETE FROM time_entries WHERE id = $1 AND tenant_id = $2',
        [entryId, tenantId]
      )

      logger.info({ event: 'TIME_ENTRY_DELETED', entryId, userId })
    } catch (error) {
      logger.error({ event: 'DELETE_TIME_ENTRY_ERROR', entryId, error: error.message })
      throw error
    }
  }

  /**
   * Get all time entries across all jobs for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {array} - All time entries
   */
  async getAllTimeEntries(tenantId, filters = {}) {
    try {
      const { userId, startDate, endDate } = filters

      let whereClause = 'WHERE te.tenant_id = $1'
      const params = [tenantId]
      let paramIndex = 2

      if (userId) {
        whereClause += ` AND te.user_id = $${paramIndex}`
        params.push(userId)
        paramIndex++
      }

      if (startDate) {
        whereClause += ` AND te.entry_date >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        whereClause += ` AND te.entry_date <= $${paramIndex}`
        params.push(endDate)
        paramIndex++
      }

      const result = await db.query(`
        SELECT 
          te.id,
          te.task_name,
          te.description,
          te.duration_minutes,
          te.entry_date,
          te.type,
          te.is_timer_entry,
          te.is_completed,
          te.completed_at,
          te.created_at,
          te.updated_at,
          te.user_id,
          te.job_id,
          u.name as staff_name,
          u.email as staff_email
        FROM time_entries te
        JOIN users u ON te.user_id = u.id
        ${whereClause}
        ORDER BY te.entry_date DESC, te.created_at DESC
      `, params)

      // Format duration for each entry
      return result.rows.map(entry => ({
        ...entry,
        duration_formatted: this.formatDuration(entry.duration_minutes)
      }))
    } catch (error) {
      logger.error({ event: 'GET_ALL_TIME_ENTRIES_ERROR', tenantId, error: error.message })
      throw error
    }
  }

  /**
   * Get total logged time for a job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Totals by type
   */
  async getJobTimeTotals(jobId, tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          SUM(duration_minutes) as total_minutes,
          SUM(CASE WHEN type = 'Billable' THEN duration_minutes ELSE 0 END) as billable_minutes,
          SUM(CASE WHEN type = 'Non-billable' THEN duration_minutes ELSE 0 END) as non_billable_minutes,
          COUNT(*) as total_entries
        FROM time_entries
        WHERE job_id = $1 AND tenant_id = $2
      `, [jobId, tenantId])

      const row = result.rows[0]
      return {
        totalHours: (row.total_minutes || 0) / 60,
        billableHours: (row.billable_minutes || 0) / 60,
        nonBillableHours: (row.non_billable_minutes || 0) / 60,
        totalEntries: parseInt(row.total_entries || 0)
      }
    } catch (error) {
      logger.error({ event: 'GET_JOB_TIME_TOTALS_ERROR', jobId, error: error.message })
      throw error
    }
  }

  /**
   * Format minutes to readable duration string
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }
}

module.exports = new TimeTrackingService()
