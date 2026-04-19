// ============================================
// src/modules/staff/staff.service.js
// Staff Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')

class StaffService {
  /**
   * Get staff with filtering and pagination
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {object} - Staff list with pagination
   */
  async getStaff(tenantId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isActive = true,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = filters

      const offset = (page - 1) * limit
      const params = [tenantId]
      let paramIndex = 2

      let whereClause = 'WHERE s.tenant_id = $1'

      // Filter active/inactive
      whereClause += ` AND s.is_active = $${paramIndex}`
      params.push(isActive)
      paramIndex++

      // Search
      if (search) {
        whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }

      // Valid sort columns
      const validSortColumns = ['name', 'email', 'role', 'created_at']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name'
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM xpm_staff s
        ${whereClause}
      `, params)

      const totalCount = parseInt(countResult.rows[0].count)

      // Get staff with workload
      const result = await db.query(`
        SELECT 
          s.id,
          s.xpm_staff_id,
          s.xpm_uuid,
          s.name,
          s.email,
          s.phone,
          s.role,
          s.permissions,
          s.is_active,
          s.created_at,
          s.updated_at,
          COUNT(j.id) as total_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs
        FROM xpm_staff s
        LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.${sortColumn} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])

      return {
        staff: result.rows.map(row => ({
          id: row.id,
          xpmStaffId: row.xpm_staff_id,
          xpmUuid: row.xpm_uuid,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          permissions: row.permissions ? (typeof row.permissions === 'object' ? row.permissions : JSON.parse(row.permissions)) : {},
          isActive: row.is_active,
          workload: {
            totalJobs: parseInt(row.total_jobs),
            activeJobs: parseInt(row.active_jobs)
          },
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
        event: 'GET_STAFF_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get single staff member by ID
   * @param {string} staffId - Staff ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Staff details
   */
  async getStaffById(staffId, tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          s.*,
          COUNT(j.id) as total_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'In Progress') as active_jobs,
          COUNT(j.id) FILTER (WHERE j.state = 'Complete') as completed_jobs,
          COUNT(j.id) FILTER (WHERE j.due_date < CURRENT_DATE AND j.state != 'Complete') as overdue_jobs
        FROM xpm_staff s
        LEFT JOIN xpm_jobs j ON s.id = j.assigned_staff_id
        WHERE s.id = $1 AND s.tenant_id = $2
        GROUP BY s.id
      `, [staffId, tenantId])

      if (result.rows.length === 0) {
        throw new NotFoundError('Staff member not found')
      }

      const staff = result.rows[0]

      return {
        id: staff.id,
        xpmStaffId: staff.xpm_staff_id,
        xpmUuid: staff.xpm_uuid,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        permissions: staff.permissions ? (typeof staff.permissions === 'object' ? staff.permissions : JSON.parse(staff.permissions)) : {},
        isActive: staff.is_active,
        workload: {
          totalJobs: parseInt(staff.total_jobs),
          activeJobs: parseInt(staff.active_jobs),
          completedJobs: parseInt(staff.completed_jobs),
          overdueJobs: parseInt(staff.overdue_jobs)
        },
        createdAt: staff.created_at,
        updatedAt: staff.updated_at,
        lastSyncedAt: staff.last_synced_at
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_STAFF_BY_ID_ERROR',
        staffId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get jobs for a staff member
   * @param {string} staffId - Staff ID
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Staff's jobs
   */
  async getStaffJobs(staffId, tenantId) {
    try {
      // Verify staff exists
      await this.getStaffById(staffId, tenantId)

      const result = await db.query(`
        SELECT 
          j.id,
          j.xpm_job_number,
          j.name,
          j.state,
          j.priority,
          j.due_date,
          j.progress,
          c.name as client_name
        FROM xpm_jobs j
        LEFT JOIN xpm_clients c ON j.client_id = c.id
        WHERE j.assigned_staff_id = $1 AND j.tenant_id = $2
        ORDER BY j.due_date ASC
      `, [staffId, tenantId])

      return result.rows.map(row => ({
        id: row.id,
        jobNumber: row.xpm_job_number,
        name: row.name,
        state: row.state,
        priority: row.priority,
        dueDate: row.due_date,
        progress: row.progress,
        clientName: row.client_name
      }))
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'GET_STAFF_JOBS_ERROR',
        staffId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create new staff member (local only)
   * @param {string} tenantId - Tenant ID
   * @param {object} staffData - Staff data
   * @returns {object} - Created staff
   */
  async createStaff(tenantId, staffData) {
    try {
      const { name, email, phone, role, permissions } = staffData;
      const perms = permissions ? JSON.stringify(permissions) : JSON.stringify({});
      const result = await db.query(`
        INSERT INTO xpm_staff (
          tenant_id,
          xpm_staff_id,
          name,
          email,
          phone,
          role,
          permissions,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
      `, [
        tenantId,
        `local-${Date.now()}`,
        name,
        email,
        phone,
        role,
        perms
      ]);
      logger.info({
        event: 'STAFF_CREATED',
        staffId: result.rows[0].id,
        tenantId,
        name
      });
      return await this.getStaffById(result.rows[0].id, tenantId);
    } catch (error) {
      logger.error({
        event: 'CREATE_STAFF_ERROR',
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update staff member
   * @param {string} staffId - Staff ID
   * @param {string} tenantId - Tenant ID
   * @param {object} updates - Update data
   * @returns {object} - Updated staff
   */
  async updateStaff(staffId, tenantId, updates) {
    try {
      // Check staff exists
      await this.getStaffById(staffId, tenantId)

      const allowedFields = ['name', 'email', 'phone', 'role', 'permissions']
      const updateFields = []
      const params = []
      let paramIndex = 1

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`)
          params.push(updates[key])
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update')
      }

      updateFields.push(`updated_at = NOW()`)
      params.push(staffId, tenantId)

      await db.query(`
        UPDATE xpm_staff
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      `, params)

      logger.info({
        event: 'STAFF_UPDATED',
        staffId,
        tenantId,
        fields: Object.keys(updates)
      })

      return await this.getStaffById(staffId, tenantId)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error
      logger.error({
        event: 'UPDATE_STAFF_ERROR',
        staffId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Toggle staff active status
   * @param {string} staffId - Staff ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} isActive - Active status
   * @returns {object} - Updated staff
   */
  async toggleActive(staffId, tenantId, isActive) {
    try {
      await db.query(`
        UPDATE xpm_staff
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [isActive, staffId, tenantId])

      logger.info({
        event: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
        staffId,
        tenantId
      })

      return await this.getStaffById(staffId, tenantId)
    } catch (error) {
      logger.error({
        event: 'TOGGLE_ACTIVE_ERROR',
        staffId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete staff member (soft delete - deactivate)
   * @param {string} staffId - Staff ID
   * @param {string} tenantId - Tenant ID
   */
  async deleteStaff(staffId, tenantId) {
    try {
      // Check for active job assignments
      const jobsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM xpm_jobs
        WHERE assigned_staff_id = $1 AND tenant_id = $2 AND state != 'Complete'
      `, [staffId, tenantId])

      if (parseInt(jobsResult.rows[0].count) > 0) {
        throw new ValidationError('Cannot delete staff with active job assignments. Deactivate instead.')
      }

      // Soft delete (deactivate)
      await this.toggleActive(staffId, tenantId, false)

      logger.info({
        event: 'STAFF_DELETED',
        staffId,
        tenantId
      })

      return { success: true }
    } catch (error) {
      if (error instanceof ValidationError) throw error
      logger.error({
        event: 'DELETE_STAFF_ERROR',
        staffId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }
}

module.exports = new StaffService()
