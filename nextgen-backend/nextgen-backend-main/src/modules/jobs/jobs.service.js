    // ============================================
// src/modules/jobs/jobs.service.js
// Jobs Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')

class JobsService {
  /**
   * Get jobs with filtering, search, and pagination
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {object} - Jobs list with pagination
   */
  async getJobs(tenantId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        state,
        priority,
        clientId,
        staffId,
        search,
        sortBy = 'due_date',
        sortOrder = 'ASC'
      } = filters

      const offset = (page - 1) * limit
      const params = [tenantId]
      let paramIndex = 2

      // Build WHERE clause
      let whereClause = 'WHERE j.tenant_id = $1'

      if (state) {
        whereClause += ` AND j.state = $${paramIndex}`
        params.push(state)
        paramIndex++
      }

      if (priority) {
        whereClause += ` AND j.priority = $${paramIndex}`
        params.push(priority)
        paramIndex++
      }

      if (clientId) {
        whereClause += ` AND j.client_id = $${paramIndex}`
        params.push(clientId)
        paramIndex++
      }

      if (staffId) {
        whereClause += ` AND j.assigned_staff_id = $${paramIndex}`
        params.push(staffId)
        paramIndex++
      }

      if (search) {
        whereClause += ` AND (j.name ILIKE $${paramIndex} OR j.xpm_job_number ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      // Valid sort columns
      const validSortColumns = ['due_date', 'created_at', 'name', 'state', 'priority']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'due_date'
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM xpm_jobs j
        ${whereClause}
      `, params)

      const totalCount = parseInt(countResult.rows[0].count)

      // Get jobs
      const result = await db.query(`
        SELECT 
          j.id,
          j.xpm_job_id,
          j.xpm_job_number,
          j.name,
          j.description,
          j.job_type,
          j.category,
          j.state,
          j.priority,
          j.start_date,
          j.due_date,
          j.budget,
          j.progress,
          j.created_at,
          j.updated_at,
          c.id as client_id,
          c.name as client_name,
          s.id as assigned_staff_id,
          s.name as assigned_staff_name,
          m.id as manager_id,
          m.name as manager_name,
          (SELECT COUNT(*) FROM xpm_tasks WHERE job_id = j.id) as task_count,
          (SELECT COUNT(*) FROM xpm_tasks WHERE job_id = j.id AND is_completed = true) as completed_task_count
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        LEFT JOIN xpm_staff m ON j.manager_id = m.id
        ${whereClause}
        ORDER BY j.${sortColumn} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])

      return {
        jobs: result.rows.map(row => ({
          id: row.id,
          xpmJobId: row.xpm_job_id,
          jobNumber: row.xpm_job_number,
          name: row.name,
          description: row.description,
          jobType: row.job_type,
          category: row.category,
          state: row.state,
          priority: row.priority,
          startDate: row.start_date,
          dueDate: row.due_date,
          budget: row.budget,
          progress: row.progress,
          client: row.client_id ? {
            id: row.client_id,
            name: row.client_name
          } : null,
          assignedStaff: row.assigned_staff_id ? {
            id: row.assigned_staff_id,
            name: row.assigned_staff_name
          } : null,
          manager: row.manager_id ? {
            id: row.manager_id,
            name: row.manager_name
          } : null,
          taskCount: parseInt(row.task_count),
          completedTaskCount: parseInt(row.completed_task_count),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get single job by ID with tasks
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Job details
   */
  async getJobById(jobId, tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          j.*,
          c.id as client_id,
          c.name as client_name,
          c.email as client_email,
          s.id as assigned_staff_id,
          s.name as assigned_staff_name,
          m.id as manager_id,
          m.name as manager_name
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        LEFT JOIN xpm_staff m ON j.manager_id = m.id
        WHERE j.id = $1 AND j.tenant_id = $2
      `, [jobId, tenantId])

      if (result.rows.length === 0) {
        throw new NotFoundError('Job not found')
      }

      const job = result.rows[0]

      // Get tasks
      const tasksResult = await db.query(`
        SELECT 
          id,
          xpm_task_id,
          name,
          description,
          is_completed,
          completed_at,
          sort_order
        FROM xpm_tasks
        WHERE job_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `, [jobId])

      return {
        id: job.id,
        xpmJobId: job.xpm_job_id,
        jobNumber: job.xpm_job_number,
        name: job.name,
        description: job.description,
        jobType: job.job_type,
        category: job.category,
        state: job.state,
        priority: job.priority,
        startDate: job.start_date,
        dueDate: job.due_date,
        budget: job.budget,
        progress: job.progress,
        client: job.client_id ? {
          id: job.client_id,
          name: job.client_name,
          email: job.client_email
        } : null,
        assignedStaff: job.assigned_staff_id ? {
          id: job.assigned_staff_id,
          name: job.assigned_staff_name
        } : null,
        manager: job.manager_id ? {
          id: job.manager_id,
          name: job.manager_name
        } : null,
        tasks: tasksResult.rows.map(task => ({
          id: task.id,
          xpmTaskId: task.xpm_task_id,
          name: task.name,
          description: task.description,
          isCompleted: task.is_completed,
          completedAt: task.completed_at,
          sortOrder: task.sort_order
        })),
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        lastSyncedAt: job.last_synced_at,
        // Notes are now handled via job_notes table and dedicated endpoints
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_JOB_BY_ID_ERROR',
        jobId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create new job
   * @param {string} tenantId - Tenant ID
   * @param {object} jobData - Job data
   * @param {string} userId - User ID
   * @returns {object} - Created job
   */
  async createJob(tenantId, jobData, userId) {
    try {
      const {
        name,
        description,
        clientId,
        jobType,
        category,
        state = 'Planned',
        priority = 'Normal',
        startDate,
        dueDate,
        budget,
        assignedStaffId,
        managerId,
        recurrence // Optional recurrence data
      } = jobData;

      // Convert empty string UUIDs to null
      const safeAssignedStaffId = assignedStaffId === '' ? null : assignedStaffId;
      const safeManagerId = managerId === '' ? null : managerId;

      const result = await db.query(`
        INSERT INTO xpm_jobs (
          tenant_id,
          xpm_job_id,
          name,
          description,
          client_id,
          job_type,
          category,
          state,
          priority,
          start_date,
          due_date,
          budget,
          assigned_staff_id,
          manager_id,
          progress
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0)
        RETURNING *
      `, [
        tenantId,
        `local-${Date.now()}`, // Local job, not from XPM
        name,
        description,
        clientId,
        jobType,
        category,
        state,
        priority,
        startDate,
        dueDate,
        budget,
        safeAssignedStaffId,
        safeManagerId
      ]);

      const createdJob = result.rows[0];

      // Create recurrence pattern if provided
      if (recurrence && recurrence.enabled) {
        try {
          const recurrenceService = require('../recurrence/recurrence.service');
          await recurrenceService.createRecurrencePattern(tenantId, {
            jobId: createdJob.id,
            frequency: recurrence.frequency,
            intervalDaysBeforeDue: recurrence.intervalDaysBeforeDue,
            autoAssignToSameStaff: recurrence.autoAssignToSameStaff,
            requireReviewBeforeCompletion: recurrence.requireReviewBeforeCompletion,
            useSameTemplateTasks: recurrence.useSameTemplateTasks,
            notifyAssigneeOnCreation: recurrence.notifyAssigneeOnCreation,
            notifyManagerOnCreation: recurrence.notifyManagerOnCreation,
            createdBy: recurrence.createdBy || userId // Use authenticated user if not provided
          });

          logger.info({
            event: 'RECURRENCE_PATTERN_CREATED_FOR_JOB',
            jobId: createdJob.id,
            tenantId,
            frequency: recurrence.frequency
          });

          // Send client notification immediately when recurrence pattern is created
          if (recurrence.autoAssignToSameStaff && createdJob.client_id) {
            try {
              const emailService = require('../../utils/emailService');
              
              logger.info({
                event: 'STAFF_NOTIFICATION_CHECK',
                autoAssignToSameStaff: recurrence.autoAssignToSameStaff,
                assignedStaffId: createdJob.assigned_staff_id,
                notifyAssigneeOnCreation: recurrence.notifyAssigneeOnCreation,
                jobId: createdJob.id
              });
              
              // Get client email
              const clientResult = await db.query(`
                SELECT name, email FROM xpm_clients 
                WHERE id = $1 AND tenant_id = $2
              `, [createdJob.client_id, tenantId]);

              if (clientResult.rows.length > 0) {
                const client = clientResult.rows[0];
                const clientEmail = client.email;

                if (clientEmail) {
                  await emailService.sendRecurringJobClientNotification(
                    clientEmail,
                    createdJob,
                    {
                      frequency: recurrence.frequency,
                      auto_assign_to_same_staff: recurrence.autoAssignToSameStaff
                    }
                  );

                  logger.info({
                    event: 'RECURRENCE_CREATION_CLIENT_NOTIFICATION_SENT',
                    jobId: createdJob.id,
                    clientId: createdJob.client_id,
                    clientEmail,
                    tenantId
                  });
                } else {
                  logger.warn({
                    event: 'CLIENT_NO_EMAIL_FOR_RECURRENCE',
                    clientId: createdJob.client_id,
                    clientName: client.name
                  });
                }
              } else {
                logger.warn({
                  event: 'CLIENT_NOT_FOUND_FOR_RECURRENCE',
                  clientId: createdJob.client_id,
                  tenantId
                });
              }

              // Also send staff notification if conditions are met
              if (recurrence.notifyAssigneeOnCreation && createdJob.assigned_staff_id) {
                logger.info({
                  event: 'STAFF_NOTIFICATION_SENDING',
                  staffId: createdJob.assigned_staff_id,
                  jobId: createdJob.id
                });

                const staffResult = await db.query(`
                  SELECT name, email 
                  FROM xpm_staff 
                  WHERE id = $1 AND tenant_id = $2
                `, [createdJob.assigned_staff_id, tenantId]);

                logger.info({
                  event: 'STAFF_QUERY_RESULT',
                  staffId: createdJob.assigned_staff_id,
                  found: staffResult.rows.length > 0,
                  staffData: staffResult.rows[0] || null
                });

                if (staffResult.rows.length > 0) {
                  const staff = staffResult.rows[0];
                  if (staff.email) {
                    await emailService.sendRecurringJobStaffNotification(
                      staff.email,
                      createdJob,
                      {
                        frequency: recurrence.frequency,
                        auto_assign_to_same_staff: recurrence.autoAssignToSameStaff
                      }
                    );

                    logger.info({
                      event: 'RECURRENCE_CREATION_STAFF_NOTIFICATION_SENT',
                      jobId: createdJob.id,
                      staffId: createdJob.assigned_staff_id,
                      staffEmail: staff.email,
                      tenantId
                    });
                  } else {
                    logger.warn({
                      event: 'STAFF_NO_EMAIL_FOR_RECURRENCE',
                      staffId: createdJob.assigned_staff_id,
                      staffName: staff.name
                    });
                  }
                } else {
                  logger.warn({
                    event: 'STAFF_NOT_FOUND_FOR_RECURRENCE',
                    staffId: createdJob.assigned_staff_id,
                    tenantId
                  });
                }
              } else {
                logger.info({
                  event: 'STAFF_NOTIFICATION_SKIPPED',
                  notifyAssigneeOnCreation: recurrence.notifyAssigneeOnCreation,
                  assignedStaffId: createdJob.assigned_staff_id,
                  jobId: createdJob.id
                });
              }
            } catch (notificationError) {
              logger.error({
                event: 'RECURRENCE_CLIENT_NOTIFICATION_ERROR',
                jobId: createdJob.id,
                error: notificationError.message
              });
              // Don't fail the job creation for notification errors
            }
          }
        } catch (recurrenceError) {
          logger.error({
            event: 'CREATE_RECURRENCE_FOR_JOB_ERROR',
            jobId: createdJob.id,
            tenantId,
            error: recurrenceError.message
          });
          // Don't fail the job creation if recurrence fails
        }
      }

      logger.info({
        event: 'JOB_CREATED',
        jobId: createdJob.id,
        tenantId,
        name
      });

      return await this.getJobById(createdJob.id, tenantId)
    } catch (error) {
      logger.error({
        event: 'CREATE_JOB_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updates - Update data
   * @returns {object} - Updated job
   */
  async updateJob(jobId, tenantId, updates) {
    try {
      // Check job exists
      await this.getJobById(jobId, tenantId)

      const allowedFields = [
        'name', 'description', 'state', 'priority', 'start_date',
        'due_date', 'budget', 'assigned_staff_id', 'manager_id', 'job_type', 'category'
      ]

      const updateFields = []
      const params = []
      let paramIndex = 1

      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        if (allowedFields.includes(snakeKey)) {
          updateFields.push(`${snakeKey} = $${paramIndex}`)
          params.push(updates[key])
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update')
      }

      updateFields.push(`updated_at = NOW()`)
      params.push(jobId, tenantId)

      await db.query(`
        UPDATE xpm_jobs
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      `, params)

      logger.info({
        event: 'JOB_UPDATED',
        jobId,
        tenantId,
        fields: Object.keys(updates)
      })

      return await this.getJobById(jobId, tenantId)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error
      logger.error({
        event: 'UPDATE_JOB_ERROR',
        jobId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteJob(jobId, tenantId) {
    try {
      // Check job exists
      await this.getJobById(jobId, tenantId)

      // Delete job (tasks cascade delete)
      await db.query(
        'DELETE FROM xpm_jobs WHERE id = $1 AND tenant_id = $2',
        [jobId, tenantId]
      )

      logger.info({
        event: 'JOB_DELETED',
        jobId,
        tenantId
      })

      return { success: true }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'DELETE_JOB_ERROR',
        jobId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Assign job to staff
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {string} staffId - Staff ID
   * @returns {object} - Updated job
   */
  async assignJob(jobId, tenantId, staffId) {
    try {
      await db.query(`
        UPDATE xpm_jobs
        SET assigned_staff_id = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [staffId, jobId, tenantId])

      logger.info({
        event: 'JOB_ASSIGNED',
        jobId,
        staffId,
        tenantId
      })

      return await this.getJobById(jobId, tenantId)
    } catch (error) {
      logger.error({
        event: 'ASSIGN_JOB_ERROR',
        jobId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Calculate and update job progress
   * @param {string} jobId - Job ID
   */
  async updateProgress(jobId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_completed = true) as completed
        FROM xpm_tasks
        WHERE job_id = $1
      `, [jobId])

      const { total, completed } = result.rows[0]
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0

      await db.query(
        'UPDATE xpm_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
        [progress, jobId]
      )

      return progress
    } catch (error) {
      logger.error({
        event: 'UPDATE_PROGRESS_ERROR',
        jobId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get tasks for a job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Tasks
   */
  async getTasks(jobId, tenantId) {
    try {
      // Verify job exists and belongs to tenant
      await this.getJobById(jobId, tenantId)

      const result = await db.query(`
        SELECT 
          id,
          xpm_task_id,
          name,
          description,
          is_completed,
          completed_at,
          sort_order,
          created_at
        FROM xpm_tasks
        WHERE job_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `, [jobId])

      return result.rows.map(task => ({
        id: task.id,
        xpmTaskId: task.xpm_task_id,
        name: task.name,
        description: task.description,
        isCompleted: task.is_completed,
        completedAt: task.completed_at,
        sortOrder: task.sort_order,
        createdAt: task.created_at
      }))
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_TASKS_ERROR',
        jobId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Add task to job
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {object} taskData - Task data
   * @returns {object} - Created task
   */
  async addTask(jobId, tenantId, taskData) {
    try {
      // Verify job exists
      await this.getJobById(jobId, tenantId)

      const { name, description, sortOrder } = taskData

      const result = await db.query(`
        INSERT INTO xpm_tasks (
          tenant_id,
          job_id,
          xpm_task_id,
          name,
          description,
          is_completed,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, false, $6)
        RETURNING *
      `, [
        tenantId,
        jobId,
        `local-${Date.now()}`,
        name,
        description,
        sortOrder || 0
      ])

      // Update job progress
      await this.updateProgress(jobId)

      logger.info({
        event: 'TASK_ADDED',
        taskId: result.rows[0].id,
        jobId,
        tenantId
      })

      const task = result.rows[0]
      return {
        id: task.id,
        name: task.name,
        description: task.description,
        isCompleted: task.is_completed,
        sortOrder: task.sort_order
      }
    } catch (error) {
      logger.error({
        event: 'ADD_TASK_ERROR',
        jobId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updates - Update data
   * @returns {object} - Updated task
   */
  async updateTask(taskId, jobId, tenantId, updates) {
    try {
      const allowed = ['name', 'description', 'sort_order']
      const fields = []
      const params = []
      let idx = 1

      Object.keys(updates).forEach(key => {
        const snake = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
        if (allowed.includes(snake)) {
          fields.push(`${snake} = $${idx}`)
          params.push(updates[key])
          idx++
        }
      })

      if (fields.length === 0) {
        throw new ValidationError('No valid fields to update')
      }

      params.push(taskId, jobId, tenantId)

      const result = await db.query(`
        UPDATE xpm_tasks
        SET ${fields.join(', ')}
        WHERE id = $${idx} AND job_id = $${idx + 1} AND tenant_id = $${idx + 2}
        RETURNING *
      `, params)

      if (result.rows.length === 0) {
        throw new NotFoundError('Task not found')
      }

      return result.rows[0]
    } catch (error) {
      logger.error({
        event: 'UPDATE_TASK_ERROR',
        taskId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Toggle task completion
   * @param {string} taskId - Task ID
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} isCompleted - Completion status
   * @returns {object} - Updated task
   */
  async toggleTaskCompletion(taskId, jobId, tenantId, isCompleted) {
    try {
      const result = await db.query(`
        UPDATE xpm_tasks
        SET is_completed = $1,
            completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END
        WHERE id = $2 AND job_id = $3 AND tenant_id = $4
        RETURNING *
      `, [isCompleted, taskId, jobId, tenantId])

      if (result.rows.length === 0) {
        throw new NotFoundError('Task not found')
      }

      // Update job progress
      await this.updateProgress(jobId)

      return result.rows[0]
    } catch (error) {
      logger.error({
        event: 'TOGGLE_TASK_ERROR',
        taskId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @param {string} jobId - Job ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteTask(taskId, jobId, tenantId) {
    try {
      const result = await db.query(
        'DELETE FROM xpm_tasks WHERE id = $1 AND job_id = $2 AND tenant_id = $3',
        [taskId, jobId, tenantId]
      )

      if (result.rowCount === 0) {
        throw new NotFoundError('Task not found')
      }

      // Update job progress
      await this.updateProgress(jobId)

      return { success: true }
    } catch (error) {
      logger.error({
        event: 'DELETE_TASK_ERROR',
        taskId,
        error: error.message
      })
      throw error
    }
  }

   /**
    * Add a note for a job
    * @param {string} jobId - Job ID
    * @param {string} tenantId - Tenant ID
    * @param {string} note - Note content
    * @returns {object} - Created note
    */
    async addJobNote(jobId, tenantId, note) {
      try {
        await this.getJobById(jobId, tenantId);
        const result = await db.query(
          'INSERT INTO job_notes (job_id, tenant_id, note) VALUES ($1, $2, $3) RETURNING *',
          [jobId, tenantId, note]
        );
        logger.info({ event: 'JOB_NOTE_ADDED', jobId, tenantId });
        return result.rows[0];
      } catch (error) {
        logger.error({ event: 'ADD_JOB_NOTE_ERROR', jobId, tenantId, error: error.message });
        throw error;
      }
    }

    /**
    * Get all notes for a job
    * @param {string} jobId - Job ID
    * @param {string} tenantId - Tenant ID
    * @returns {array} - Notes array
    */
    async getJobNotes(jobId, tenantId) {
      try {
        await this.getJobById(jobId, tenantId);
        const result = await db.query(
          'SELECT * FROM job_notes WHERE job_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
          [jobId, tenantId]
        );
        return result.rows;
      } catch (error) {
        logger.error({ event: 'GET_JOB_NOTES_ERROR', jobId, tenantId, error: error.message });
        throw error;
      }
    }

    /**
    * Update a note for a job
    * @param {string} noteId - Note ID
    * @param {string} jobId - Job ID
    * @param {string} tenantId - Tenant ID
    * @param {string} note - New note content
    * @returns {object} - Updated note
    */
    async updateJobNote(noteId, jobId, tenantId, note) {
      try {
        await this.getJobById(jobId, tenantId);
        const result = await db.query(
          'UPDATE job_notes SET note = $1, created_at = NOW() WHERE id = $2 AND job_id = $3 AND tenant_id = $4 RETURNING *',
          [note, noteId, jobId, tenantId]
        );
        if (result.rows.length === 0) {
          throw new NotFoundError('Note not found');
        }
        logger.info({ event: 'JOB_NOTE_UPDATED', noteId, jobId, tenantId });
        return result.rows[0];
      } catch (error) {
        logger.error({ event: 'UPDATE_JOB_NOTE_ERROR', noteId, jobId, tenantId, error: error.message });
        throw error;
      }
    }

    /**
    * Delete a note for a job
    * @param {string} noteId - Note ID
    * @param {string} jobId - Job ID
    * @param {string} tenantId - Tenant ID
    * @returns {object} - Success
    */
    async deleteJobNote(noteId, jobId, tenantId) {
      try {
        await this.getJobById(jobId, tenantId);
        const result = await db.query(
          'DELETE FROM job_notes WHERE id = $1 AND job_id = $2 AND tenant_id = $3',
          [noteId, jobId, tenantId]
        );
        logger.info({ event: 'JOB_NOTE_DELETED', noteId, jobId, tenantId });
        return { success: true };
      } catch (error) {
        logger.error({ event: 'DELETE_JOB_NOTE_ERROR', noteId, jobId, tenantId, error: error.message });
        throw error;
      }
    }

}

module.exports = new JobsService()
