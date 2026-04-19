// ============================================
// src/modules/recurrence/recurrence.service.js
// Job Recurrence Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')
const jobsService = require('../jobs/jobs.service')
const emailService = require('../../utils/emailService')

class RecurrenceService {
  /**
   * Create a new recurrence pattern for a job
   * @param {string} tenantId - Tenant ID
   * @param {object} recurrenceData - Recurrence configuration
   * @returns {object} - Created recurrence pattern
   */
  async createRecurrencePattern(tenantId, recurrenceData) {
    try {
      const {
        jobId,
        frequency,
        intervalDaysBeforeDue = 5,
        autoAssignToSameStaff = true,
        requireReviewBeforeCompletion = false,
        useSameTemplateTasks = true,
        notifyAssigneeOnCreation = true,
        notifyManagerOnCreation = false,
        createdBy
      } = recurrenceData

      // Validate job exists and belongs to tenant
      const jobResult = await db.query(`
        SELECT id, due_date, assigned_staff_id, manager_id, tenant_id
        FROM xpm_jobs 
        WHERE id = $1 AND tenant_id = $2
      `, [jobId, tenantId])

      if (jobResult.rows.length === 0) {
        throw new NotFoundError('Job not found')
      }

      const job = jobResult.rows[0]

      // Calculate next creation date
      const nextCreationDate = this.calculateNextCreationDate(job.due_date, frequency, intervalDaysBeforeDue)
      
      // Format date as YYYY-MM-DD for database DATE field
      const formattedDate = nextCreationDate.toISOString().split('T')[0]

      // Create recurrence pattern
      const result = await db.query(`
        INSERT INTO job_recurrence_patterns (
          tenant_id,
          job_id,
          frequency,
          interval_days_before_due,
          auto_assign_to_same_staff,
          require_review_before_completion,
          use_same_template_tasks,
          notify_assignee_on_creation,
          notify_manager_on_creation,
          next_creation_date,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        tenantId,
        jobId,
        frequency,
        intervalDaysBeforeDue,
        autoAssignToSameStaff,
        requireReviewBeforeCompletion,
        useSameTemplateTasks,
        notifyAssigneeOnCreation,
        notifyManagerOnCreation,
        formattedDate,
        createdBy
      ])

      const pattern = result.rows[0]

      logger.info({
        event: 'RECURRENCE_PATTERN_CREATED',
        tenantId,
        patternId: pattern.id,
        jobId,
        frequency,
        nextCreationDate
      })

      return pattern
    } catch (error) {
      logger.error({
        event: 'CREATE_RECURRENCE_PATTERN_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Update a recurrence pattern
   * @param {string} patternId - Pattern ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updateData - Update data
   * @returns {object} - Updated pattern
   */
  async updateRecurrencePattern(patternId, tenantId, updateData) {
    try {
      // Check if pattern exists and belongs to tenant
      const existingResult = await db.query(`
        SELECT * FROM job_recurrence_patterns 
        WHERE id = $1 AND tenant_id = $2
      `, [patternId, tenantId])

      if (existingResult.rows.length === 0) {
        throw new NotFoundError('Recurrence pattern not found')
      }

      const existing = existingResult.rows[0]

      // Build update query
      const updateFields = []
      const params = [patternId, tenantId]
      let paramIndex = 3

      const allowedFields = [
        'frequency',
        'intervalDaysBeforeDue',
        'autoAssignToSameStaff',
        'requireReviewBeforeCompletion',
        'useSameTemplateTasks',
        'notifyAssigneeOnCreation',
        'notifyManagerOnCreation',
        'isActive'
      ]

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
          updateFields.push(`${dbField} = $${paramIndex}`)
          params.push(updateData[field])
          paramIndex++
        }
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update')
      }

      // Recalculate next creation date if frequency or interval changed
      if (updateData.frequency || updateData.intervalDaysBeforeDue) {
        const jobResult = await db.query(`
          SELECT due_date FROM xpm_jobs WHERE id = $1
        `, [existing.job_id])
        
        if (jobResult.rows.length > 0) {
          const frequency = updateData.frequency || existing.frequency
          const intervalDays = updateData.intervalDaysBeforeDue || existing.interval_days_before_due
          const nextDate = this.calculateNextCreationDate(jobResult.rows[0].due_date, frequency, intervalDays)
          
          // Format date as YYYY-MM-DD for database DATE field
          const formattedNextDate = nextDate.toISOString().split('T')[0]
          
          updateFields.push(`next_creation_date = $${paramIndex}`)
          params.push(formattedNextDate)
          paramIndex++
        }
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)

      const result = await db.query(`
        UPDATE job_recurrence_patterns 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, params)

      return result.rows[0]
    } catch (error) {
      logger.error({
        event: 'UPDATE_RECURRENCE_PATTERN_ERROR',
        tenantId,
        patternId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete a recurrence pattern
   * @param {string} patternId - Pattern ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteRecurrencePattern(patternId, tenantId) {
    try {
      // Get pattern details before deletion
      const patternResult = await db.query(`
        SELECT * FROM job_recurrence_patterns 
        WHERE id = $1 AND tenant_id = $2
      `, [patternId, tenantId])

      if (patternResult.rows.length === 0) {
        throw new NotFoundError('Recurrence pattern not found')
      }

      // Delete the pattern (cascade will handle related records)
      await db.query(`
        DELETE FROM job_recurrence_patterns 
        WHERE id = $1 AND tenant_id = $2
      `, [patternId, tenantId])

      logger.info({
        event: 'RECURRENCE_PATTERN_DELETED',
        tenantId,
        patternId
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_RECURRENCE_PATTERN_ERROR',
        tenantId,
        patternId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get recurrence patterns for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {object} - Recurrence patterns with pagination
   */
  async getRecurrencePatterns(tenantId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        jobId,
        isActive,
        frequency
      } = filters

      const offset = (page - 1) * limit
      const params = [tenantId]
      let paramIndex = 2

      // Build WHERE clause
      let whereClause = 'WHERE rp.tenant_id = $1'

      if (jobId) {
        whereClause += ` AND rp.job_id = $${paramIndex}`
        params.push(jobId)
        paramIndex++
      }

      if (isActive !== undefined) {
        whereClause += ` AND rp.is_active = $${paramIndex}`
        params.push(isActive)
        paramIndex++
      }

      if (frequency) {
        whereClause += ` AND rp.frequency = $${paramIndex}`
        params.push(frequency)
        paramIndex++
      }

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM job_recurrence_patterns rp
        ${whereClause}
      `, params)

      const totalCount = parseInt(countResult.rows[0].count)

      // Get patterns with job details
      const result = await db.query(`
        SELECT 
          rp.*,
          j.name as job_name,
          j.xpm_job_number,
          j.due_date as original_due_date,
          c.name as client_name,
          s.name as assigned_staff_name,
          m.name as manager_name
        FROM job_recurrence_patterns rp
        LEFT JOIN xpm_jobs j ON rp.job_id = j.id
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        LEFT JOIN xpm_staff m ON j.manager_id = m.id
        ${whereClause}
        ORDER BY rp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])

      return {
        patterns: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_RECURRENCE_PATTERNS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Process due recurrence patterns and create new jobs
   * @param {string} tenantId - Tenant ID (optional, for single tenant processing)
   * @returns {object} - Processing results
   */
  async processDueRecurrences(tenantId = null) {
    try {
      const results = {
        processed: 0,
        created: 0,
        failed: 0,
        errors: []
      }

      const whereClause = tenantId ? 'WHERE tenant_id = $1 AND is_active = true AND next_creation_date <= CURRENT_DATE' : 'WHERE is_active = true AND next_creation_date <= CURRENT_DATE'
      const params = tenantId ? [tenantId] : []

      // Get due recurrence patterns
      const patternsResult = await db.query(`
        SELECT 
          rp.*,
          j.name as job_name,
          j.description as job_description,
          j.job_type,
          j.category,
          j.priority,
          j.budget,
          j.client_id,
          j.assigned_staff_id,
          j.manager_id,
          j.due_date as original_due_date,
          c.name as client_name
        FROM job_recurrence_patterns rp
        LEFT JOIN xpm_jobs j ON rp.job_id = j.id
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        ${whereClause}
        ORDER BY rp.next_creation_date ASC
      `, params)

      for (const pattern of patternsResult.rows) {
        try {
          results.processed++

          // Create the new job
          const newJob = await this.createRecurringJob(pattern)
          results.created++

          // Update pattern with next creation date
          const nextDate = this.calculateNextCreationDate(
            newJob.dueDate, 
            pattern.frequency, 
            pattern.interval_days_before_due
          )
          
          // Validate date before formatting
          if (!(nextDate instanceof Date) || isNaN(nextDate.getTime())) {
            logger.error({
              event: 'INVALID_NEXT_DATE_CALCULATED',
              newJobDueDate: newJob.dueDate,
              frequency: pattern.frequency,
              intervalDays: pattern.interval_days_before_due,
              calculatedDate: nextDate
            })
            throw new Error('Invalid next creation date calculated')
          }
          
          // Format date as YYYY-MM-DD for database DATE field
          const formattedNextDate = nextDate.toISOString().split('T')[0]

          await db.query(`
            UPDATE job_recurrence_patterns 
            SET next_creation_date = $1, last_created_job_id = $2
            WHERE id = $3
          `, [formattedNextDate, newJob.id, pattern.id])

          // Create instance record
          await db.query(`
            INSERT INTO job_recurrence_instances (
              recurrence_pattern_id,
              created_job_id,
              original_job_id,
              scheduled_creation_date,
              due_date,
              status
            ) VALUES ($1, $2, $3, $4, $5, 'created')
          `, [pattern.id, newJob.id, pattern.job_id, pattern.next_creation_date, newJob.dueDate])

          logger.info({
            event: 'RECURRING_JOB_CREATED',
            tenantId: pattern.tenant_id,
            patternId: pattern.id,
            newJobId: newJob.id,
            nextCreationDate: nextDate
          })

        } catch (error) {
          results.failed++
          results.errors.push({
            patternId: pattern.id,
            error: error.message
          })

          logger.error({
            event: 'CREATE_RECURRING_JOB_ERROR',
            tenantId: pattern.tenant_id,
            patternId: pattern.id,
            error: error.message
          })
        }
      }

      return results
    } catch (error) {
      logger.error({
        event: 'PROCESS_DUE_RECURRENCES_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create a new job based on recurrence pattern
   * @param {object} pattern - Recurrence pattern with job details
   * @returns {object} - Created job
   */
  async createRecurringJob(pattern) {
    try {
      // Calculate new due date based on frequency
      const newDueDate = this.calculateNextDueDate(pattern.original_due_date, pattern.frequency)

      const jobData = {
        name: pattern.job_name,
        description: pattern.job_description,
        jobType: pattern.job_type,
        category: pattern.category,
        priority: pattern.priority,
        budget: pattern.budget,
        clientId: pattern.client_id,
        assignedStaffId: pattern.auto_assign_to_same_staff ? pattern.assigned_staff_id : null,
        managerId: pattern.manager_id,
        dueDate: newDueDate,
        startDate: new Date()
      }

      // Create the job using jobs service
      const newJob = await jobsService.createJob(pattern.tenant_id, jobData)

      // Copy template tasks if enabled
      if (pattern.use_same_template_tasks) {
        await this.copyTemplateTasks(pattern.job_id, newJob.id, pattern.tenant_id)
      }

      // Send notifications (always send to client, conditional for staff)
      await this.sendRecurringJobNotifications(newJob, pattern)

      return newJob
    } catch (error) {
      logger.error({
        event: 'CREATE_RECURRING_JOB_ERROR',
        patternId: pattern.id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Copy template tasks from original job to new job
   * @param {string} originalJobId - Original job ID
   * @param {string} newJobId - New job ID
   * @param {string} tenantId - Tenant ID
   */
  async copyTemplateTasks(originalJobId, newJobId, tenantId) {
    try {
      // Get tasks from original job
      const tasksResult = await db.query(`
        SELECT name, description, sort_order
        FROM xpm_tasks 
        WHERE job_id = $1
        ORDER BY sort_order ASC
      `, [originalJobId])

      // Copy tasks to new job
      for (const task of tasksResult.rows) {
        await db.query(`
          INSERT INTO xpm_tasks (
            job_id, name, description, sort_order, tenant_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          newJobId,
          task.name,
          task.description,
          task.sort_order,
          tenantId
        ]);
      }

      logger.info({
        event: 'TEMPLATE_TASKS_COPIED',
        originalJobId,
        newJobId,
        taskCount: tasksResult.rows.length
      })
    } catch (error) {
      logger.error({
        event: 'COPY_TEMPLATE_TASKS_ERROR',
        originalJobId,
        newJobId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Calculate next creation date based on frequency and interval
   * @param {Date} dueDate - Original due date
   * @param {string} frequency - Recurrence frequency
   * @param {number} daysBefore - Days before due date to create
   * @returns {Date} - Next creation date
   */
  calculateNextCreationDate(dueDate, frequency, daysBefore) {
    // Validate inputs
    if (!dueDate) {
      throw new Error('Due date is required')
    }
    if (!frequency) {
      throw new Error('Frequency is required')
    }
    if (typeof daysBefore !== 'number' || daysBefore < 0) {
      throw new Error('Days before must be a non-negative number')
    }
    
    const due = new Date(dueDate)
    const nextDue = this.calculateNextDueDate(due, frequency)
    const creationDate = new Date(nextDue)
    creationDate.setDate(creationDate.getDate() - daysBefore)
    
    // Validate result
    if (isNaN(creationDate.getTime())) {
      throw new Error('Invalid creation date calculated')
    }
    
    return creationDate
  }

  /**
   * Calculate next due date based on frequency
   * @param {Date} currentDueDate - Current due date
   * @param {string} frequency - Recurrence frequency
   * @returns {Date} - Next due date
   */
  calculateNextDueDate(currentDueDate, frequency) {
    const nextDue = new Date(currentDueDate)
    
    switch (frequency) {
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7)
        break
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1)
        break
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3)
        break
      case 'biannual':
        nextDue.setMonth(nextDue.getMonth() + 6)
        break
      case 'yearly':
        nextDue.setFullYear(nextDue.getFullYear() + 1)
        break
      default:
        throw new ValidationError(`Invalid frequency: ${frequency}`)
    }
    
    return nextDue
  }

  /**
   * Get preview of next recurrence creation
   * @param {string} tenantId - Tenant ID
   * @param {string} jobId - Job ID
   * @param {string} frequency - Recurrence frequency
   * @param {number} intervalDaysBeforeDue - Days before due date
   * @returns {object} - Preview data
   */
  async getRecurrencePreview(tenantId, jobId, frequency, intervalDaysBeforeDue = 5) {
    try {
      // Validate frequency
      const validFrequencies = ['weekly', 'monthly', 'quarterly', 'biannual', 'yearly']
      if (!validFrequencies.includes(frequency)) {
        throw new ValidationError('Invalid frequency')
      }

      // Get job details
      const jobResult = await db.query(`
        SELECT name, due_date, tenant_id
        FROM xpm_jobs 
        WHERE id = $1 AND tenant_id = $2
      `, [jobId, tenantId])

      if (jobResult.rows.length === 0) {
        throw new NotFoundError('Job not found')
      }

      const job = jobResult.rows[0]

      // Calculate next dates
      const nextDueDate = this.calculateNextDueDate(job.due_date, frequency)
      const nextCreationDate = this.calculateNextCreationDate(job.due_date, frequency, intervalDaysBeforeDue)

      // Get frequency display name
      const frequencyMap = {
        weekly: 'weekly',
        monthly: 'monthly',
        quarterly: 'quarterly',
        biannual: 'every 6 months',
        yearly: 'yearly'
      }

      return {
        nextCreationDate,
        nextDueDate,
        frequency: frequencyMap[frequency],
        intervalDaysBeforeDue: parseInt(intervalDaysBeforeDue),
        previewText: `Auto-creates ${frequencyMap[frequency]}, ${intervalDaysBeforeDue} days before due date — assigns to same staff — notifies by email`
      }
    } catch (error) {
      logger.error({
        event: 'GET_RECURRENCE_PREVIEW_ERROR',
        tenantId,
        jobId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Send notifications for recurring job creation
   * @param {object} newJob - Created job
   * @param {object} pattern - Recurrence pattern
   */
  async sendRecurringJobNotifications(newJob, pattern) {
    try {
      // Send notification to assigned staff if auto-assign is enabled
      if (pattern.auto_assign_to_same_staff && pattern.assigned_staff_id && pattern.notify_assignee_on_creation) {
        // Get staff email
        const staffResult = await db.query(`
          SELECT name, email 
          FROM xpm_staff 
          WHERE id = $1 AND tenant_id = $2
        `, [pattern.assigned_staff_id, pattern.tenant_id])

        if (staffResult.rows.length > 0) {
          const staff = staffResult.rows[0]
          if (staff.email) {
            await emailService.sendRecurringJobStaffNotification(
              staff.email,
              newJob,
              pattern
            )
            
            logger.info({
              event: 'RECURRING_JOB_STAFF_NOTIFICATION_SENT',
              jobId: newJob.id,
              staffId: pattern.assigned_staff_id,
              staffEmail: staff.email,
              tenantId: pattern.tenant_id
            })
          }
        }
      }

      // Send notification to client if recurrence is enabled
      if (pattern.client_id) {
        logger.info({
          event: 'CLIENT_NOTIFICATION_CHECK',
          clientId: pattern.client_id,
          tenantId: pattern.tenant_id,
          jobId: newJob.id
        })

        // Get client email
        const clientResult = await db.query(`
          SELECT name, email FROM xpm_clients 
          WHERE id = $1 AND tenant_id = $2
        `, [pattern.client_id, pattern.tenant_id])

        logger.info({
          event: 'CLIENT_QUERY_RESULT',
          clientId: pattern.client_id,
          found: clientResult.rows.length > 0,
          clientData: clientResult.rows[0] || null
        })

        if (clientResult.rows.length > 0) {
          const client = clientResult.rows[0]
          const clientEmail = client.email

          logger.info({
            event: 'CLIENT_EMAIL_CHECK',
            clientEmail,
            hasEmail: !!clientEmail
          })

          if (clientEmail) {
            await emailService.sendRecurringJobClientNotification(
              clientEmail,
              newJob,
              pattern
            )

            logger.info({
              event: 'RECURRING_JOB_CLIENT_NOTIFICATION_SENT',
              jobId: newJob.id,
              clientId: pattern.client_id,
              clientEmail,
              tenantId: pattern.tenant_id
            })
          } else {
            logger.warn({
              event: 'CLIENT_NO_EMAIL',
              clientId: pattern.client_id,
              clientName: client.name
            })
          }
        } else {
          logger.warn({
            event: 'CLIENT_NOT_FOUND',
            clientId: pattern.client_id,
            tenantId: pattern.tenant_id
          })
        }
      } else {
        logger.info({
          event: 'NO_CLIENT_ID_FOR_NOTIFICATION',
          jobId: newJob.id,
          patternId: pattern.id
        })
      }
    } catch (error) {
      logger.error({
        event: 'SEND_RECURRING_JOB_NOTIFICATIONS_ERROR',
        jobId: newJob.id,
        patternId: pattern.id,
        error: error.message
      })
      // Don't throw error to prevent job creation from failing
    }
  }
}

module.exports = new RecurrenceService()
