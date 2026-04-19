// ============================================
// src/modules/sync/sync.service.js
// XPM Data Sync Service
// ============================================
const db = require('../../config/database')
const xeroService = require('../integrations/xero/xero.service')
const logger = require('../../utils/logger')

/** Xero org UUID for API calls — matches xero_tokens.xpm_tenant_id (set on client in getClientForUser). */
function xeroApiTenantId(client) {
  if (client.activeXeroTenantId) return client.activeXeroTenantId
  return client.tenants?.[0]?.tenantId
}

class SyncService {
  /**
   * Update last sync time for integration
   * @param {string} tenantId - Tenant ID
   */
  async updateLastSyncTime(tenantId) {
    try {
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND provider = 'xero'
      `, [tenantId])

      logger.info({
        event: 'LAST_SYNC_TIME_UPDATED',
        tenantId
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_LAST_SYNC_TIME_ERROR',
        tenantId,
        error: error.message
      })
    }
  }

  /**
   * Full sync - Initial sync of all data
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Sync result
   */
  async fullSync(userId, tenantId) {
    const logId = await this.createSyncLog(tenantId, 'full', 'all', 'started')
    const startTime = Date.now()

    try {
      logger.info({
        event: 'FULL_SYNC_START',
        tenantId,
        userId,
        logId
      })

      // Get authenticated XPM client
      const client = await xeroService.getClientForUser(userId)
      
      if (!client) {
        throw new Error('Failed to get Xero client - client is null')
      }
      
      let totalRecords = 0

      // Sync in order (dependencies matter)
      const clientsCount = await this.syncClients(client, tenantId)
      totalRecords += clientsCount

      const staffCount = await this.syncStaff(client, tenantId)
      totalRecords += staffCount

      const categoriesCount = await this.syncCategories(client, tenantId)
      totalRecords += categoriesCount

      const jobsCount = await this.syncJobs(client, tenantId)
      totalRecords += jobsCount

      const tasksCount = await this.syncTasks(client, tenantId)
      totalRecords += tasksCount

      // Update sync log
      const duration = Date.now() - startTime
      await this.updateSyncLog(logId, 'completed', totalRecords, null, duration)

      // Update last sync time
      await this.updateLastSyncTime(tenantId)

      logger.info({
        event: 'FULL_SYNC_COMPLETE',
        tenantId,
        totalRecords,
        duration: `${duration}ms`
      })

      return {
        success: true,
        totalRecords,
        duration,
        breakdown: {
          clients: clientsCount,
          staff: staffCount,
          categories: categoriesCount,
          jobs: jobsCount,
          tasks: tasksCount
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      await this.updateSyncLog(logId, 'failed', 0, error.message, duration)

      logger.info({
        event: 'FULL_SYNC_ERROR',
        tenantId,
        userId,
        error: error.message,
        stack: error.stack
      })

      throw error
    }
  }

  /**
   * Delta sync - Sync only modified data
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Sync result
   */
  async deltaSync(userId, tenantId) {
    const logId = await this.createSyncLog(tenantId, 'delta', 'all', 'started')
    const startTime = Date.now()

    try {
      logger.info({
        event: 'DELTA_SYNC_START',
        tenantId,
        logId
      })

      // Get last sync time
      const lastSync = await this.getLastSyncTime(tenantId)
      
      if (!lastSync) {
        // No previous sync, run full sync instead
        logger.info({
          event: 'DELTA_SYNC_FALLBACK_TO_FULL',
          tenantId,
          reason: 'No previous sync found'
        })
        return await this.fullSync(userId, tenantId)
      }

      const client = await xeroService.getClientForUser(userId)
      let totalRecords = 0

      // Sync modified data only
      const clientsCount = await this.syncClients(client, tenantId, lastSync)
      totalRecords += clientsCount

      const staffCount = await this.syncStaff(client, tenantId, lastSync)
      totalRecords += staffCount

      const jobsCount = await this.syncJobs(client, tenantId, lastSync)
      totalRecords += jobsCount

      const tasksCount = await this.syncTasks(client, tenantId, lastSync)
      totalRecords += tasksCount

      const duration = Date.now() - startTime
      await this.updateSyncLog(logId, 'completed', totalRecords, null, duration)
      await this.updateLastSyncTime(tenantId)

      logger.info({
        event: 'DELTA_SYNC_COMPLETE',
        tenantId,
        totalRecords,
        duration: `${duration}ms`
      })

      return {
        success: true,
        totalRecords,
        duration,
        lastSync,
        breakdown: {
          clients: clientsCount,
          staff: staffCount,
          jobs: jobsCount,
          tasks: tasksCount
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      await this.updateSyncLog(logId, 'failed', 0, error.message, duration)

      logger.error({
        event: 'DELTA_SYNC_ERROR',
        tenantId,
        error: error.message
      })

      throw error
    }
  }

  /**
   * Sync clients from XPM
   */
  async syncClients(client, tenantId, modifiedSince = null) {
    try {
      let clients = []
      
      // Use Xero Accounting API to get contacts (clients)
      if (client.accountingApi) {
        try {
          const xeroTid = xeroApiTenantId(client)
          logger.info({
            event: 'SYNC_CLIENTS_API_CALL',
            tenantId,
            tenantIdValue: xeroTid
          })
          
          const response = await client.accountingApi.getContacts(
            xeroTid,
            null, // ifModifiedSince
            null, // where
            null, // order
            null, // iDs
            null, // page
            null, // includeArchived
            null, // summaryOnly
            null  // searchTerm
          )
          
          clients = response.body.contacts || []
          
          logger.info({
            event: 'SYNC_CLIENTS_API_RESPONSE',
            tenantId,
            contactsCount: clients.length,
            responseStatus: response.response?.statusCode
          })
        } catch (apiError) {
          logger.error({
            event: 'SYNC_CLIENTS_API_ERROR',
            tenantId,
            error: apiError.message,
            code: apiError.statusCode,
            response: apiError.response?.body
          })
          throw apiError
        }
      } else {
        logger.warn({
          event: 'SYNC_CLIENTS_NO_API',
          tenantId,
          message: 'client.accountingApi is not available'
        })
      }

      logger.info({
        event: 'SYNC_CLIENTS_PROCESSING',
        tenantId,
        count: clients.length
      })

      let synced = 0

      for (const xpmClient of clients) {
        await db.query(`
          INSERT INTO xpm_clients (
            tenant_id,
            xpm_client_id,
            xpm_uuid,
            name,
            email,
            phone,
            address,
            is_archived,
            xpm_data,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (tenant_id, xpm_client_id)
          DO UPDATE SET
            name = $4,
            email = $5,
            phone = $6,
            address = $7,
            is_archived = $8,
            xpm_data = $9,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          tenantId,
          xpmClient.contactID,
          xpmClient.contactID,
          xpmClient.name,
          xpmClient.emailAddress || null,
          xpmClient.phones?.[0]?.phoneNumber || null,
          xpmClient.addresses ? JSON.stringify(xpmClient.addresses) : null,
          xpmClient.contactStatus === 'ARCHIVED',
          JSON.stringify(xpmClient)
        ])

        synced++
      }

      return synced
    } catch (error) {
      logger.error({
        event: 'SYNC_CLIENTS_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Sync staff from XPM
   */
  async syncStaff(client, tenantId, modifiedSince = null) {
    try {
      logger.info({
        event: 'SYNC_STAFF_START',
        tenantId,
        modifiedSince,
        hasAccountingApi: !!client.accountingApi
      })

      let staff = []

      // Xero doesn't have a direct "staff" API in Accounting API
      // Users can be accessed via Xero's connected apps or Projects API
      // For now, we'll log that this needs to be implemented with the correct API
      if (client.accountingApi) {
        try {
          logger.info({
            event: 'SYNC_STAFF_NOTE',
            tenantId,
            message: 'Staff sync requires Xero Projects API or XPM (Practice Manager) API which needs separate implementation'
          })
        } catch (apiError) {
          logger.error({
            event: 'SYNC_STAFF_API_ERROR',
            tenantId,
            error: apiError.message
          })
        }
      }

      logger.info({
        event: 'SYNC_STAFF_PROCESSING',
        tenantId,
        count: staff.length
      })

      let synced = 0

      for (const xpmStaff of staff) {
        await db.query(`
          INSERT INTO xpm_staff (
            tenant_id,
            xpm_staff_id,
            xpm_uuid,
            name,
            email,
            phone,
            role,
            is_active,
            xpm_data,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (tenant_id, xpm_staff_id)
          DO UPDATE SET
            name = $4,
            email = $5,
            phone = $6,
            role = $7,
            is_active = $8,
            xpm_data = $9,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          tenantId,
          xpmStaff.id,
          xpmStaff.uuid,
          xpmStaff.name,
          xpmStaff.email || null,
          xpmStaff.phone || null,
          xpmStaff.role || null,
          xpmStaff.isActive !== false,
          JSON.stringify(xpmStaff)
        ])

        synced++
      }

      return synced
    } catch (error) {
      logger.error({
        event: 'SYNC_STAFF_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Sync categories from XPM
   */
  async syncCategories(client, tenantId, modifiedSince = null) {
    try {
      let categories = []

      // Xero Accounting API has tracking categories
      if (client.accountingApi) {
        try {
          const xeroTid = xeroApiTenantId(client)
          logger.info({
            event: 'SYNC_CATEGORIES_API_CALL',
            tenantId,
            tenantIdValue: xeroTid
          })

          const response = await client.accountingApi.getTrackingCategories(
            xeroTid,
            null, // where
            null  // order
          )

          categories = response.body.trackingCategories || []

          logger.info({
            event: 'SYNC_CATEGORIES_API_RESPONSE',
            tenantId,
            categoriesCount: categories.length,
            responseStatus: response.response?.statusCode
          })
        } catch (apiError) {
          logger.error({
            event: 'SYNC_CATEGORIES_API_ERROR',
            tenantId,
            error: apiError.message,
            code: apiError.statusCode,
            response: apiError.response?.body
          })
          throw apiError
        }
      } else {
        logger.warn({
          event: 'SYNC_CATEGORIES_NO_API',
          tenantId,
          message: 'client.accountingApi is not available'
        })
      }

      logger.info({
        event: 'SYNC_CATEGORIES_PROCESSING',
        tenantId,
        count: categories.length
      })

      let synced = 0

      for (const category of categories) {
        await db.query(`
          INSERT INTO xpm_categories (
            tenant_id,
            xpm_category_id,
            name,
            description,
            xpm_data,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (tenant_id, xpm_category_id)
          DO UPDATE SET
            name = $3,
            description = $4,
            xpm_data = $5,
            last_synced_at = NOW()
        `, [
          tenantId,
          category.trackingCategoryID,
          category.name,
          category.status || null,
          JSON.stringify(category)
        ])

        synced++
      }

      return synced
    } catch (error) {
      logger.error({
        event: 'SYNC_CATEGORIES_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Sync jobs from XPM
   */
  async syncJobs(client, tenantId, modifiedSince = null) {
    try {
      let jobs = []

      // Jobs/Projects in Xero can be accessed via Projects API if enabled
      // XPM (Practice Manager) has proper job tracking but requires separate API
      if (client.projectApi) {
        try {
          const xeroTid = xeroApiTenantId(client)
          logger.info({
            event: 'SYNC_JOBS_API_CALL',
            tenantId,
            tenantIdValue: xeroTid
          })

          // Xero Projects API - get projects which can be considered as jobs
          const response = await client.projectApi.getProjects(
            xeroTid,
            null, // projectIds
            null, // contactId
            null, // name
            null  // status
          )

          jobs = response.body.items || []

          logger.info({
            event: 'SYNC_JOBS_API_RESPONSE',
            tenantId,
            jobsCount: jobs.length,
            responseStatus: response.response?.statusCode
          })
        } catch (apiError) {
          logger.warn({
            event: 'SYNC_JOBS_API_ERROR',
            tenantId,
            error: apiError.message,
            code: apiError.statusCode,
            note: 'Projects API may not be enabled for this Xero organization'
          })
        }
      } else {
        logger.warn({
          event: 'SYNC_JOBS_NO_API',
          tenantId,
          message: 'Projects API not available - jobs sync requires Xero Projects API or XPM (Practice Manager) API'
        })
      }

      logger.info({
        event: 'SYNC_JOBS_PROCESSING',
        tenantId,
        count: jobs.length
      })

      let synced = 0

      for (const job of jobs) {
        // Find client ID from xpm_client_id
        const clientResult = await db.query(
          'SELECT id FROM xpm_clients WHERE tenant_id = $1 AND xpm_client_id = $2',
          [tenantId, job.clientId]
        )

        const clientId = clientResult.rows[0]?.id || null

        await db.query(`
          INSERT INTO xpm_jobs (
            tenant_id,
            xpm_job_id,
            xpm_job_number,
            client_id,
            name,
            description,
            job_type,
            category,
            state,
            start_date,
            due_date,
            budget,
            xpm_data,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (tenant_id, xpm_job_id)
          DO UPDATE SET
            xpm_job_number = $3,
            client_id = $4,
            name = $5,
            description = $6,
            job_type = $7,
            category = $8,
            state = $9,
            start_date = $10,
            due_date = $11,
            budget = $12,
            xpm_data = $13,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          tenantId,
          job.projectId,
          job.projectNumber || null,
          clientId,
          job.name,
          job.description || null,
          'Project',
          null,
          job.status || 'In Progress',
          job.startDate || null,
          job.deadlineUtc || null,
          job.budgetAmount || null,
          JSON.stringify(job)
        ])

        synced++
      }

      return synced
    } catch (error) {
      logger.error({
        event: 'SYNC_JOBS_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Sync tasks from XPM
   */
  async syncTasks(client, tenantId, modifiedSince = null) {
    try {
     let tasks = []

      // Tasks in Xero are part of the Projects API
      if (client.projectApi) {
        try {
          const xeroTid = xeroApiTenantId(client)
          logger.info({
            event: 'SYNC_TASKS_API_CALL',
            tenantId,
            tenantIdValue: xeroTid
          })

          // Get all projects first to get their tasks
          const projectsResponse = await client.projectApi.getProjects(
            xeroTid
          )
          const projects = projectsResponse.body.items || []

          logger.info({
            event: 'SYNC_TASKS_PROJECTS_FOUND',
            tenantId,
            projectsCount: projects.length
          })

          // For each project, get its tasks
          for (const project of projects) {
            try {
              const taskResponse = await client.projectApi.getProjectTasks(
                xeroTid,
                project.projectId
              )
              const projectTasks = taskResponse.body.items || []

              // Add project reference to each task
              for (const task of projectTasks) {
                task.projectId = project.projectId
                task.projectName = project.name
              }

              tasks = tasks.concat(projectTasks)
            } catch (taskError) {
              logger.warn({
                event: 'SYNC_TASKS_PROJECT_TASKS_ERROR',
                tenantId,
                projectId: project.projectId,
                error: taskError.message
              })
            }
          }

          logger.info({
            event: 'SYNC_TASKS_API_RESPONSE',
            tenantId,
            tasksCount: tasks.length
          })
        } catch (apiError) {
          logger.warn({
            event: 'SYNC_TASKS_API_ERROR',
            tenantId,
            error: apiError.message,
            code: apiError.statusCode,
            note: 'Projects API may not be enabled for this Xero organization'
          })
        }
      } else {
        logger.warn({
          event: 'SYNC_TASKS_NO_API',
          tenantId,
          message: 'Projects API not available - tasks sync requires Xero Projects API or XPM (Practice Manager) API'
        })
      }

      logger.info({
        event: 'SYNC_TASKS_PROCESSING',
        tenantId,
        count: tasks.length
      })

      let synced = 0

      for (const task of tasks) {
        // Find job ID from xpm_job_id
        const jobResult = await db.query(
          'SELECT id FROM xpm_jobs WHERE tenant_id = $1 AND xpm_job_id = $2',
          [tenantId, task.jobId]
        )

        if (jobResult.rows.length === 0) {
          continue // Skip if job not found
        }

        const jobId = jobResult.rows[0].id

        await db.query(`
          INSERT INTO xpm_tasks (
            tenant_id,
            job_id,
            xpm_task_id,
            name,
            description,
            is_completed,
            completed_at,
            sort_order,
            xpm_data,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (tenant_id, xpm_task_id)
          DO UPDATE SET
            name = $4,
            description = $5,
            is_completed = $6,
            completed_at = $7,
            sort_order = $8,
            xpm_data = $9,
            last_synced_at = NOW()
        `, [
          tenantId,
          jobId,
          task.id,
          task.name,
          task.description || null,
          task.isCompleted || false,
          task.completedAt || null,
          task.sortOrder || 0,
          JSON.stringify(task)
        ])

        synced++
      }

      return synced
    } catch (error) {
      logger.error({
        event: 'SYNC_TASKS_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Create sync log entry
   */
  async createSyncLog(tenantId, syncType, entity, status) {
    const result = await db.query(`
      INSERT INTO sync_logs (
        tenant_id,
        sync_type,
        entity,
        status,
        started_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, [tenantId, syncType, entity, status])

    return result.rows[0].id
  }

  /**
   * Update sync log entry
   */
  async updateSyncLog(logId, status, recordsSynced = 0, errorMessage = null, durationMs = null) {
    await db.query(`
      UPDATE sync_logs
      SET status = $1,
          records_synced = $2,
          error_message = $3,
          completed_at = NOW(),
          duration_ms = $4
      WHERE id = $5
    `, [status, recordsSynced, errorMessage, durationMs, logId])
  }

  /**
   * Get last successful sync time for tenant
   */
  async getLastSyncTime(tenantId) {
    const result = await db.query(`
      SELECT completed_at
      FROM sync_logs
      WHERE tenant_id = $1
        AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [tenantId])

    return result.rows[0]?.completed_at || null
  }

  /**
   * Get sync status for tenant
   */
  async getSyncStatus(tenantId) {
    const result = await db.query(`
      SELECT 
        id,
        sync_type,
        entity,
        status,
        records_synced,
        error_message,
        started_at,
        completed_at,
        duration_ms
      FROM sync_logs
      WHERE tenant_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `, [tenantId])

    // Get Xero integration status
    const integrationResult = await db.query(`
      SELECT 
        provider,
        status,
        last_sync_at,
        error_message,
        updated_at
      FROM integrations
      WHERE tenant_id = $1 AND provider = 'xero'
    `, [tenantId])

    const xeroIntegration = integrationResult.rows[0] || null

    return {
      history: result.rows,
      xero: {
        connected: xeroIntegration?.status === 'connected',
        status: xeroIntegration?.status || 'disconnected',
        lastSyncAt: xeroIntegration?.last_sync_at,
        errorMessage: xeroIntegration?.error_message,
        lastUpdated: xeroIntegration?.updated_at
      }
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(tenantId) {
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM xpm_clients WHERE tenant_id = $1) as clients_count,
        (SELECT COUNT(*) FROM xpm_staff WHERE tenant_id = $1) as staff_count,
        (SELECT COUNT(*) FROM xpm_jobs WHERE tenant_id = $1) as jobs_count,
        (SELECT COUNT(*) FROM xpm_tasks WHERE tenant_id = $1) as tasks_count,
        (SELECT MAX(last_synced_at) FROM xpm_clients WHERE tenant_id = $1) as last_client_sync,
        (SELECT MAX(last_synced_at) FROM xpm_jobs WHERE tenant_id = $1) as last_job_sync
    `, [tenantId])

    return statsResult.rows[0]
  }
}

module.exports = new SyncService()
