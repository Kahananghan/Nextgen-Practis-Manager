// ============================================
// src/modules/clients/clients.routes.js
// ============================================
const clientsController = require('./clients.controller')
const clientsValidation = require('./clients.validation')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function clientsRoutes(fastify, options) {
  /**
   * @route GET /clients
   * @desc Get clients list with filtering and pagination
   * @access Private
   */
  fastify.get('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get clients list',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //querystring: clientsValidation.getClients.query
    }
  }, clientsController.getClients)

  /**
   * @route GET /clients/:id
   * @desc Get single client with stats
   * @access Private
   */
  fastify.get('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get client by ID',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params
    }
  }, clientsController.getClientById)

  /**
   * @route GET /clients/:id/jobs
   * @desc Get client's jobs
   * @access Private
   */
  fastify.get('/:id/jobs', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all jobs for a client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params
    }
  }, clientsController.getClientJobs)

  /**
   * @route POST /clients
   * @desc Create new client
   * @access Private
   */
  fastify.post('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create new client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //body: clientsValidation.createClient.body
    }
  }, clientsController.createClient)

  /**
   * @route PUT /clients/:id
   * @desc Update client
   * @access Private
   */
  fastify.put('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update client details',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params,
      //body: clientsValidation.updateClient.body
    }
  }, clientsController.updateClient)

  /**
   * @route PUT /clients/:id/archive
   * @desc Archive client
   * @access Private
   */
  fastify.put('/:id/archive', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Archive client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params
    }
  }, clientsController.archiveClient)

  /**
   * @route PUT /clients/:id/unarchive
   * @desc Unarchive client
   * @access Private
   */
  fastify.put('/:id/unarchive', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Unarchive client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params
    }
  }, clientsController.unarchiveClient)

  /**
   * @route DELETE /clients/:id
   * @desc Delete client (soft delete - archives)
   * @access Private
   */
  fastify.delete('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete client (archives if no active jobs)',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
      //params: clientsValidation.uuidParam.params
    }
  }, clientsController.deleteClient)

   /**
   * @route POST /clients/:id/favourite
   * @desc Add a favourite client for a user
   * @access Private
   */
  fastify.post('/:id/favourite', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Add a favourite client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
    }
  }, clientsController.addFavouriteClient)

   /**
   * @route DELETE /clients/:id/favourite
   * @desc Remove a favourite client for a user
   * @access Private
   */
  fastify.delete('/:id/favourite', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Remove a favourite client',
      tags: ['Clients'],
      security: [{ bearerAuth: [] }],
    }
  }, clientsController.removeFavouriteClient);

  /**
     * @route GET /clients/favourites
     * @desc Get all favourite clients for the authenticated user
     * @access Private
     */
    fastify.get('/favourites', {
      preHandler: [authenticate, ensureTenantIsolation],
      schema: {
        description: 'Get favourite clients',
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
      }
    }, clientsController.getFavouriteClients)

}

module.exports = clientsRoutes
