// src/modules/clients/contacts.routes.js
const contactsController = require('./contacts.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function contactsRoutes(fastify, options) {
  /**
   * @route POST /clients/:clientId/contacts
   * @desc Create a new contact for a client
   * @access Private
   */
  fastify.post('/clients/:clientId/contacts', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create a new contact for a client',
      tags: ['Contacts'],
      security: [{ bearerAuth: [] }],
    }
  }, contactsController.createContact)

  /**
   * @route GET /clients/:clientId/contacts
   * @desc Get all contacts for a client
   * @access Private
   */
  fastify.get('/clients/:clientId/contacts', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all contacts for a client',
      tags: ['Contacts'],
      security: [{ bearerAuth: [] }],
    }
  }, contactsController.getContactsByClient)
}

module.exports = contactsRoutes
