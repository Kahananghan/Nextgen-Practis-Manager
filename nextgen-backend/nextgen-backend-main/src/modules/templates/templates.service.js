// ============================================
// src/modules/templates/templates.service.js
// Job Templates Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')

class TemplatesService {
  /**
   * Get all templates for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Templates list
   */
  async getTemplates(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          t.id,
          t.name,
          t.description,
          t.job_type,
          t.created_at,
          COUNT(tt.id) as task_count
        FROM templates t
        LEFT JOIN template_tasks tt ON t.id = tt.template_id
        WHERE t.tenant_id = $1
        GROUP BY t.id, t.name, t.description, t.job_type, t.created_at
        ORDER BY t.name ASC
      `, [tenantId])

      const templates = [];
      for (const row of result.rows) {
        // Fetch tasks for this template
        const tasksResult = await db.query(`
          SELECT id, name, description, sort_order
          FROM template_tasks
          WHERE template_id = $1
          ORDER BY sort_order ASC
        `, [row.id]);
        templates.push({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.job_type,
          isPublic: row.is_public,
          taskCount: parseInt(row.task_count),
          createdAt: row.created_at,
          tasks: tasksResult.rows.map(task => ({
            id: task.id,
            name: task.name,
            description: task.description,
            sortOrder: task.sort_order
          }))
        });
      }
      return templates;
    } catch (error) {
      logger.error({
        event: 'GET_TEMPLATES_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get single template by ID with tasks
   * @param {string} templateId - Template ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Template with tasks
   */
  async getTemplateById(templateId, tenantId) {
    try {
      // Get template
      const templateResult = await db.query(`
        SELECT * FROM templates
        WHERE id = $1 AND tenant_id = $2
      `, [templateId, tenantId])

      if (templateResult.rows.length === 0) {
        throw new NotFoundError('Template not found')
      }

      const template = templateResult.rows[0]

      // Get task templates
      const tasksResult = await db.query(`
        SELECT 
          id,
          name,
          description,
          sort_order
        FROM template_tasks
        WHERE template_id = $1
        ORDER BY sort_order ASC
      `, [templateId])

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.job_type,
        isPublic: template.is_public,
        tasks: tasksResult.rows.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description,
          sortOrder: task.sort_order
        })),
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_TEMPLATE_BY_ID_ERROR',
        templateId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create new template
   * @param {string} tenantId - Tenant ID
   * @param {object} templateData - Template data
   * @returns {object} - Created template
   */
  async createTemplate(tenantId, templateData) {
    const client = await db.pool.connect()

    try {
      await client.query('BEGIN')

      const { name, description, category = false, tasks = [] } = templateData

      // Create template
      const templateResult = await client.query(`
        INSERT INTO templates (
          tenant_id,
          name,
          description,
          job_type
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [tenantId, name, description, category])

      const templateId = templateResult.rows[0].id

      // Create task templates
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        await client.query(`
          INSERT INTO template_tasks (
            template_id,
            name,
            description,
            sort_order
          )
          VALUES ($1, $2, $3, $4)
        `, [
          templateId,
          task.name,
          task.description || null,
          task.sortOrder !== undefined ? task.sortOrder : i
        ])
      }

      await client.query('COMMIT')

      logger.info({
        event: 'TEMPLATE_CREATED',
        templateId,
        tenantId,
        name
      })

      return await this.getTemplateById(templateId, tenantId)
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error({
        event: 'CREATE_TEMPLATE_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updates - Update data
   * @returns {object} - Updated template
   */
  async updateTemplate(templateId, tenantId, updates) {
    const client = await db.pool.connect()

    try {
      await client.query('BEGIN')

      // Verify template exists
      await this.getTemplateById(templateId, tenantId)

      // Update template basic info
      const { name, description, category, isPublic, tasks } = updates
      
      if (name || description || category || isPublic !== undefined) {
        const updateFields = []
        const params = []
        let idx = 1

        if (name) {
          updateFields.push(`name = $${idx}`)
          params.push(name)
          idx++
        }
        if (description !== undefined) {
          updateFields.push(`description = $${idx}`)
          params.push(description)
          idx++
        }
        if (category) {
          updateFields.push(`job_type = $${idx}`)
          params.push(category)
          idx++
        }
        if (isPublic !== undefined) {
          updateFields.push(`is_public = $${idx}`)
          params.push(isPublic)
          idx++
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`)
          params.push(templateId, tenantId)

          await client.query(`
            UPDATE templates
            SET ${updateFields.join(', ')}
            WHERE id = $${idx} AND tenant_id = $${idx + 1}
          `, params)
        }
      }

      // Update tasks if provided
      if (tasks) {
        // Delete existing tasks
        await client.query(
          'DELETE FROM template_tasks WHERE template_id = $1',
          [templateId]
        )

        // Insert new tasks
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i]
          await client.query(`
            INSERT INTO template_tasks (
              template_id,
              name,
              description,
              sort_order
            )
            VALUES ($1, $2, $3, $4)
          `, [
            templateId,
            task.name,
            task.description || null,
            task.sortOrder !== undefined ? task.sortOrder : i
          ])
        }
      }

      await client.query('COMMIT')

      logger.info({
        event: 'TEMPLATE_UPDATED',
        templateId,
        tenantId
      })

      return await this.getTemplateById(templateId, tenantId)
    } catch (error) {
      await client.query('ROLLBACK')
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'UPDATE_TEMPLATE_ERROR',
        templateId,
        tenantId,
        error: error.message
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Delete template
   * @param {string} templateId - Template ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteTemplate(templateId, tenantId) {
    try {
      // Verify exists
      await this.getTemplateById(templateId, tenantId)

      // Delete (cascade deletes tasks)
      await db.query(
        'DELETE FROM templates WHERE id = $1 AND tenant_id = $2',
        [templateId, tenantId]
      )

      logger.info({
        event: 'TEMPLATE_DELETED',
        templateId,
        tenantId
      })

      return { success: true }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'DELETE_TEMPLATE_ERROR',
        templateId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create job from template
   * @param {string} templateId - Template ID
   * @param {string} tenantId - Tenant ID
   * @param {object} jobData - Job-specific data (clientId, etc.)
   * @returns {object} - Created job
   */
  async createJobFromTemplate(templateId, tenantId, jobData) {
    const client = await db.pool.connect()

    try {
      await client.query('BEGIN')

      // Get template with tasks
      const template = await this.getTemplateById(templateId, tenantId)

      const {
        name,
        clientId,
        startDate,
        dueDate,
        assignedStaffId,
        managerId,
        priority = 'Normal'
      } = jobData

      // Create job
      const jobResult = await client.query(`
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
          assigned_staff_id,
          manager_id,
          progress
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Planned', $8, $9, $10, $11, $12, 0)
        RETURNING *
      `, [
        tenantId,
        `local-${Date.now()}`,
        name,
        template.description,
        clientId,
        template.job_type,
        template.job_type,
        priority,
        startDate,
        dueDate,
        assignedStaffId,
        managerId
      ])

      const jobId = jobResult.rows[0].id

      // Create tasks from template
      for (const taskTemplate of template.tasks) {
        await client.query(`
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
        `, [
          tenantId,
          jobId,
          `local-${Date.now()}-${taskTemplate.sortOrder}`,
          taskTemplate.name,
          taskTemplate.description,
          taskTemplate.sortOrder
        ])
      }

      await client.query('COMMIT')

      logger.info({
        event: 'JOB_CREATED_FROM_TEMPLATE',
        templateId,
        jobId,
        tenantId,
        taskCount: template.tasks.length
      })

      // Return created job (need to query with joins)
      const jobsService = require('../jobs/jobs.service')
      return await jobsService.getJobById(jobId, tenantId)
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error({
        event: 'CREATE_JOB_FROM_TEMPLATE_ERROR',
        templateId,
        tenantId,
        error: error.message
      })
      throw error
    } finally {
      client.release()
    }
  }
}

module.exports = new TemplatesService()
