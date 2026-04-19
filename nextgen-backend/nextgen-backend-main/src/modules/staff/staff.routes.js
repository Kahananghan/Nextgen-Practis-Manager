// ============================================
// src/modules/staff/staff.routes.js
// ============================================
const staffController = require('./staff.controller')
const staffValidation = require('./staff.validation')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function staffRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get staff list',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //querystring: staffValidation.getStaff.query
    }
  }, staffController.getStaff)

  fastify.get('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get staff member by ID',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params
    }
  }, staffController.getStaffById)

  fastify.get('/:id/jobs', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all jobs for staff member',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params
    }
  }, staffController.getStaffJobs)

  fastify.post('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create new staff member',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //body: staffValidation.createStaff.body
    }
  }, staffController.createStaff)

  fastify.put('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update staff member',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params,
      //body: staffValidation.updateStaff.body
    }
  }, staffController.updateStaff)

  fastify.put('/:id/deactivate', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Deactivate staff member',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params
    }
  }, staffController.deactivateStaff)

  fastify.put('/:id/activate', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Activate staff member',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params
    }
  }, staffController.activateStaff)

  fastify.delete('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete staff member (deactivates if has active jobs)',
      tags: ['Staff'],
      security: [{ bearerAuth: [] }],
      //params: staffValidation.uuidParam.params
    }
  }, staffController.deleteStaff)
}

module.exports = staffRoutes
