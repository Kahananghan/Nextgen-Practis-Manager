// src/modules/clients/contacts.service.js
const db = require('../../config/database')
const logger = require('../../utils/logger')

class ContactsService {
  /**
   * Create a new contact for a client
   */
  async createContact(tenantId, data) {
    const { clientId, contactName, email, phone, position } = data
    const result = await db.query(
      `INSERT INTO contacts (tenant_id, client_id, name, email, phone, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, clientId, contactName, email, phone, position]
    )
    return result.rows[0]
  }

  /**
   * Get all contacts for a client
   */
  async getContactsByClient(tenantId, clientId) {
    const result = await db.query(
      `SELECT * FROM contacts WHERE tenant_id = $1 AND client_id = $2 ORDER BY created_at DESC`,
      [tenantId, clientId]
    )
    return result.rows
  }
}

module.exports = new ContactsService()
