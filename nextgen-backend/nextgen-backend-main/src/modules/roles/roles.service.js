const db = require('../../config/database');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError } = require('../../utils/errors');

class RolesService {
  /**
   * Create a new role
   * @param {object} params - Role details
   * @returns {object} - Created role
   */
  async createRole({ tenantId, name, description, isSystem = false }) {
    try {
      const result = await db.query(
        `INSERT INTO roles (tenant_id, name, description, is_system) VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, name, description, isSystem]
      );
      logger.info({ event: 'ROLE_CREATED', tenantId, name });
      return result.rows[0];
    } catch (error) {
      logger.error({ event: 'CREATE_ROLE_ERROR', error: error.message });
      throw new ValidationError('Failed to create role');
    }
  }

  /**
   * Delete a role
   * @param {object} params - Tenant and role ID
   * @returns {object} - Deleted role
   */
  async deleteRole({ tenantId, roleId }) {
    try {
      const result = await db.query(
        `DELETE FROM roles WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, roleId]
      );
      if (result.rows.length === 0) throw new NotFoundError('Role not found');
      logger.info({ event: 'ROLE_DELETED', tenantId, roleId });
      return result.rows[0];
    } catch (error) {
      logger.error({ event: 'DELETE_ROLE_ERROR', error: error.message });
      throw error;
    }
  }

  /**
   * Get roles for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {array} - List of roles
   */
  async getRoles(tenantId) {
    try {
      // Fetch roles
      const rolesResult = await db.query(
        `SELECT * FROM roles WHERE tenant_id = $1 ORDER BY name`,
        [tenantId]
      );
      const roles = rolesResult.rows;

      // Fetch users assigned to each role
      const userRolesResult = await db.query(
        `SELECT ur.role_id, u.id, u.name, u.email
         FROM user_roles ur
         JOIN users u ON ur.user_id = u.id
         WHERE ur.role_id = ANY($1::uuid[])`,
        [roles.map(r => r.id)]
      );

      // Group users by role_id
      const usersByRole = {};
      userRolesResult.rows.forEach(row => {
        if (!usersByRole[row.role_id]) usersByRole[row.role_id] = [];
        usersByRole[row.role_id].push({ id: row.id, name: row.name, email: row.email });
      });

      // Attach users and userCount to each role
      roles.forEach(role => {
        role.users = usersByRole[role.id] || [];
        role.userCount = role.users.length;
      });

      logger.info({ event: 'GET_ROLES', tenantId });
      return roles;
    } catch (error) {
      logger.error({ event: 'GET_ROLES_ERROR', error: error.message });
      throw error;
    }
  }
}

module.exports = new RolesService();