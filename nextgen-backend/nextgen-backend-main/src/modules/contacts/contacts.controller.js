// src/modules/clients/contacts.controller.js
const contactsService = require('./contacts.service')
const logger = require('../../utils/logger')

class ContactsController {
  /**
   * POST /clients/:clientId/contacts
   * Create a new contact for a client
   */
  async createContact(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const clientId = request.params.clientId
      const { contactName, email, phone, position } = request.body
      const contact = await contactsService.createContact(tenantId, {
        clientId,
        contactName,
        email,
        phone,
        position
      })
      return reply.code(201).send({ success: true, data: contact })
    } catch (error) {
      logger.error({ event: 'CREATE_CONTACT_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to create contact' } })
    }
  }

  /**
   * GET /clients/:clientId/contacts
   * Get all contacts for a client
   */
  async getContactsByClient(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const clientId = request.params.clientId
      const contacts = await contactsService.getContactsByClient(tenantId, clientId)
      return reply.send({ success: true, data: contacts })
    } catch (error) {
      logger.error({ event: 'GET_CONTACTS_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch contacts' } })
    }
  }
}

module.exports = new ContactsController()
