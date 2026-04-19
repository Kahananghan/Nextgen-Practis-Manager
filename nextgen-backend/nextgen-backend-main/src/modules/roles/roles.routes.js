// ============================================
// src/modules/roles/roles.routes.fastify.js - Roles Routes (Fastify)
// ============================================
const rolesController = require('./roles.controller')
const rolesValidation = {} // Add validation schemas if needed
const { authenticate } = require('../../middleware/auth')

async function rolesRoutes(fastify, options) {
  fastify.decorate('db', require('../../config/database'))

  /**
   * @route POST /roles
   * @desc Create a new role
   * @access Private
   */
  fastify.post('/', {
    preHandler: authenticate,
    schema: {
      description: 'Create a new role',
      tags: ['Roles'],
      //body: rolesValidation.createRole,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object', 
              properties: { 
                role: { 
                  type: 'object',
                  additionalProperties: true 
                } 
              } 
            }
          }
        }
      }
    }
  }, rolesController.createRole)

  /**
   * @route DELETE /roles/:id
   * @desc Delete a role
   * @access Private
   */
  fastify.delete('/:id', {
    preHandler: authenticate,
    schema: {
      description: 'Delete a role',
      tags: ['Roles'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object', 
              properties: { 
                role: { 
                  type: 'object',
                  additionalProperties: true 
                } 
              } 
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'object' }
          }
        }
      }
    }
  }, rolesController.deleteRole)

  /**
   * @route GET /roles
   * @desc Get all roles for tenant
   * @access Private
   */
  fastify.get('/', {
    preHandler: authenticate,
    schema: {
      description: 'Get all roles for tenant',
      tags: ['Roles'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object', 
              properties: { 
                roles: { 
                  type: 'array', 
                  items: { 
                    type: 'object', 
                    additionalProperties: true
                  } 
                } 
              } 
            }
          }
        }
      }
    }
  }, rolesController.getRoles)

}

module.exports = rolesRoutes
