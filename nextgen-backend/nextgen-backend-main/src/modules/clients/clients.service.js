// ============================================
// src/modules/clients/clients.service.js
// Clients Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')

class ClientsService {
  /**
   * Get clients with filtering and pagination
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {object} - Clients list with pagination
   */
  async getClients(tenantId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isArchived = false,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = filters

      const offset = (page - 1) * limit
      const params = [tenantId]
      let paramIndex = 2

      let whereClause = 'WHERE c.tenant_id = $1'

      // Filter archived
      whereClause += ` AND c.is_archived = $${paramIndex}`
      params.push(isArchived)
      paramIndex++

      // Search
      if (search) {
        whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      // Valid sort columns
      const validSortColumns = ['name', 'email', 'created_at']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name'
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM xpm_clients c
        ${whereClause}
      `, params)

      const totalCount = parseInt(countResult.rows[0].count)

      // Get clients with job counts
      const result = await db.query(`
        SELECT 
          c.id,
          c.xpm_client_id,
          c.xpm_uuid,
          c.name,
          c.email,
          c.phone,
          c.address,
          c.is_archived,
          c.created_at,
          c.updated_at,
          COUNT(j.id) as job_count,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_job_count
        FROM xpm_clients c
        LEFT JOIN xpm_jobs j ON c.id = j.client_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.${sortColumn} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])

      return {
        clients: result.rows.map(row => ({
          id: row.id,
          xpmClientId: row.xpm_client_id,
          xpmUuid: row.xpm_uuid,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address || null,
          isArchived: row.is_archived,
          jobCount: parseInt(row.job_count),
          activeJobCount: parseInt(row.active_job_count),
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
        event: 'GET_CLIENTS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get single client by ID
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Client details
   */
  async getClientById(clientId, tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          c.*,
          COUNT(j.id) as total_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs
        FROM xpm_clients c
        LEFT JOIN xpm_jobs j ON c.id = j.client_id
        WHERE c.id = $1 AND c.tenant_id = $2
        GROUP BY c.id
      `, [clientId, tenantId])

      if (result.rows.length === 0) {
        throw new NotFoundError('Client not found')
      }

      const client = result.rows[0]

      return {
        id: client.id,
        xpmClientId: client.xpm_client_id,
        xpmUuid: client.xpm_uuid,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: typeof client.address === 'string' ? JSON.parse(client.address) : client.address || null,
        isArchived: client.is_archived,
        stats: {
          totalJobs: parseInt(client.total_jobs),
          activeJobs: parseInt(client.active_jobs),
          completedJobs: parseInt(client.completed_jobs)
        },
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        lastSyncedAt: client.last_synced_at
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_CLIENT_BY_ID_ERROR',
        clientId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get jobs for a client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Client's jobs
   */
  async getClientJobs(clientId, tenantId) {
    try {
      // Verify client exists
      await this.getClientById(clientId, tenantId)

      const result = await db.query(`
        SELECT 
          j.id,
          j.xpm_job_number,
          j.name,
          j.job_type,
          j.category,
          j.state,
          j.priority,
          j.due_date,
          j.progress,
          s.name as assigned_staff_name
        FROM xpm_jobs j
        LEFT JOIN xpm_staff s ON j.assigned_staff_id = s.id
        WHERE j.client_id = $1 AND j.tenant_id = $2
        ORDER BY j.due_date DESC
      `, [clientId, tenantId])

      return result.rows.map(row => ({
        id: row.id,
        jobNumber: row.xpm_job_number,
        name: row.name,
        jobType: row.job_type,
        category: row.category,
        state: row.state,
        priority: row.priority,
        dueDate: row.due_date,
        progress: row.progress,
        assignedStaffName: row.assigned_staff_name
      }))
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_CLIENT_JOBS_ERROR',
        clientId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create new client (local only, not synced from XPM)
   * @param {string} tenantId - Tenant ID
   * @param {object} clientData - Client data
   * @returns {object} - Created client
   */
  async createClient(tenantId, clientData) {
    try {
      const { name, email, phone, address } = clientData
       
      let addressValue = null

      if (address) {
        if (typeof address === 'object') {
          addressValue = JSON.stringify(address)
        } else if (typeof address === 'string') {
          addressValue = address
        }
      }

      const result = await db.query(`
        INSERT INTO xpm_clients (
          tenant_id,
          xpm_client_id,
          name,
          email,
          phone,
          address,
          is_archived
        )
        VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING *
      `, [
        tenantId,
        `local-${Date.now()}`,
        name,
        email,
        phone,
        addressValue
      ])

      logger.info({
        event: 'CLIENT_CREATED',
        clientId: result.rows[0].id,
        tenantId,
        name
      })

      return await this.getClientById(result.rows[0].id, tenantId)
    } catch (error) {
      logger.error({
        event: 'CREATE_CLIENT_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updates - Update data
   * @returns {object} - Updated client
   */
  async updateClient(clientId, tenantId, updates) {
    try {
      // Check client exists
      await this.getClientById(clientId, tenantId)

      const allowedFields = ['name', 'email', 'phone', 'address']
      const updateFields = []
      const params = []
      let paramIndex = 1

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`)
          params.push(key === 'address' && updates[key] ? JSON.stringify(updates[key]) : updates[key])
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update')
      }

      updateFields.push(`updated_at = NOW()`)
      params.push(clientId, tenantId)

      await db.query(`
        UPDATE xpm_clients
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      `, params)

      logger.info({
        event: 'CLIENT_UPDATED',
        clientId,
        tenantId,
        fields: Object.keys(updates)
      })

      return await this.getClientById(clientId, tenantId)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error
      logger.error({
        event: 'UPDATE_CLIENT_ERROR',
        clientId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Archive/unarchive client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} isArchived - Archive status
   * @returns {object} - Updated client
   */
  async toggleArchive(clientId, tenantId, isArchived) {
    try {
      await db.query(`
        UPDATE xpm_clients
        SET is_archived = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [isArchived, clientId, tenantId])

      logger.info({
        event: isArchived ? 'CLIENT_ARCHIVED' : 'CLIENT_UNARCHIVED',
        clientId,
        tenantId
      })

      return await this.getClientById(clientId, tenantId)
    } catch (error) {
      logger.error({
        event: 'TOGGLE_ARCHIVE_ERROR',
        clientId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete client (soft delete - archive)
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteClient(clientId, tenantId) {
    try {
      // Check for active jobs
      const jobsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_jobs
        WHERE client_id = $1 AND tenant_id = $2 AND state != 'Complete'
      `, [clientId, tenantId])

      if (parseInt(jobsResult.rows[0].count) > 0) {
        throw new ValidationError('Cannot delete client with active jobs. Archive instead.')
      }

      // Soft delete (archive)
      await this.toggleArchive(clientId, tenantId, true)

      logger.info({
        event: 'CLIENT_DELETED',
        clientId,
        tenantId
      })

      return { success: true }
    } catch (error) {
      if (error instanceof ValidationError) throw error
      logger.error({
        event: 'DELETE_CLIENT_ERROR',
        clientId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Add a favourite client for a user
   * @param {string} userId - User ID
   * @param {string} clientId - Client ID
   * @returns {object} - Favourite client record
   */
  async addFavouriteClient(userId, clientId) {
    try {
      const result = await db.query(`
        INSERT INTO favourite_clients (user_id, client_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, client_id) DO NOTHING
        RETURNING *
      `, [userId, clientId])
      if (result.rows.length === 0) {
        throw new ValidationError('Client is already favourited')
      }
      logger.info({
        event: 'FAVOURITE_CLIENT_ADDED',
        userId,
        clientId
      })
      return result.rows[0]
    } catch (error) {
      logger.error({
        event: 'ADD_FAVOURITE_CLIENT_ERROR',
        userId,
        clientId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Remove a favourite client for a user
   * @param {string} userId - User ID
   * @param {string} clientId - Client ID
   * @returns {object} - Result
   */
  async removeFavouriteClient(userId, clientId) {
    try {
      const result = await db.query(`
        DELETE FROM favourite_clients
        WHERE user_id = $1 AND client_id = $2
        RETURNING *
      `, [userId, clientId]);
      if (result.rows.length === 0) {
        throw new ValidationError('Client was not favourited');
      }
      logger.info({
        event: 'FAVOURITE_CLIENT_REMOVED',
        userId,
        clientId
      });
      return { success: true };
    } catch (error) {
      logger.error({
        event: 'REMOVE_FAVOURITE_CLIENT_ERROR',
        userId,
        clientId,
        error: error.message
      });
      throw error;
    }
  }

   /**
     * Get favourite clients for a user
     * @param {string} userId - User ID
     * @returns {Array} - List of favourite clients
     */
    async getFavouriteClients(userId) {
      try {
        const result = await db.query(`
          SELECT c.*
          FROM favourite_clients f
          JOIN xpm_clients c ON f.client_id = c.id
          WHERE f.user_id = $1
          ORDER BY c.name ASC
        `, [userId])
        return result.rows.map(row => ({
          id: row.id,
          xpmClientId: row.xpm_client_id,
          xpmUuid: row.xpm_uuid,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address || null,
          isArchived: row.is_archived,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      } catch (error) {
        logger.error({
          event: 'GET_FAVOURITE_CLIENTS_ERROR',
          userId,
          error: error.message
        })
        throw error
      }
    }
}

module.exports = new ClientsService()
