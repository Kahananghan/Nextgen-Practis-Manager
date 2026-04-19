// ============================================
// src/modules/roles/roles.controller.js - Roles Controller
// ============================================
const rolesService = require('./roles.service');
const logger = require('../../utils/logger');

class RolesController {
  /**
   * Create a new role
   * POST /roles
   * @param {object} request - Fastify request
   * @param {object} reply - Fastify reply
   */
  async createRole(request, reply) {
    try {
      const { name, description, isSystem } = request.body;
      const tenantId = request.user.tenantId;
      const role = await rolesService.createRole({ tenantId, name, description, isSystem });
      return reply.code(201).send({ success: true, data: { role } });
    } catch (error) {
      logger.error({ event: 'CREATE_ROLE_CONTROLLER_ERROR', error: error.message });
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      });
    }
  }

  /**
   * Delete a role
   * DELETE /roles/:id
   * @param {object} request - Fastify request
   * @param {object} reply - Fastify reply
   */
  async deleteRole(request, reply) {
    try {
      const tenantId = request.user.tenantId;
      const roleId = request.params.id;
      const deleted = await rolesService.deleteRole({ tenantId, roleId });
      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: {
            name: 'NotFoundError',
            message: 'Role not found',
            statusCode: 404
          }
        });
      }
      return reply.send({ success: true, data: { role: deleted } });
    } catch (error) {
      logger.error({ event: 'DELETE_ROLE_CONTROLLER_ERROR', error: error.message });
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      });
    }
  }

  /**
   * Get all roles for tenant
   * GET /roles
   * @param {object} request - Fastify request
   * @param {object} reply - Fastify reply
   */
  async getRoles(request, reply) {
    try {
      const tenantId = request.user.tenantId;
      const roles = await rolesService.getRoles(tenantId);
      return reply.send({ success: true, data: { roles } });
    } catch (error) {
      logger.error({ event: 'GET_ROLES_CONTROLLER_ERROR', error: error.message });
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      });
    }
  }

}

module.exports = new RolesController();