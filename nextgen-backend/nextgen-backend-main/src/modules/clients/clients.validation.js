// ============================================
// src/modules/clients/clients.validation.js
// ============================================
const Joi = require('joi')

const clientsValidation = {
  // Get clients query params
  getClients: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      search: Joi.string().max(255),
      isArchived: Joi.boolean().default(false),
      sortBy: Joi.string().valid('name', 'email', 'created_at'),
      sortOrder: Joi.string().valid('ASC', 'DESC')
    })
  },

  // Create client
  createClient: {
    body: Joi.object({
      name: Joi.string().required().max(255).messages({
        'any.required': 'Client name is required'
      }),
      email: Joi.string().email().allow('', null).max(255),
      phone: Joi.string().allow('', null).max(50),
      address: Joi.object({
        street: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
        postalCode: Joi.string().allow(''),
        country: Joi.string().allow('')
      }).allow(null)
    })
  },

  // Update client
  updateClient: {
    body: Joi.object({
      name: Joi.string().max(255),
      email: Joi.string().email().allow('', null).max(255),
      phone: Joi.string().allow('', null).max(50),
      address: Joi.object({
        street: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
        postalCode: Joi.string().allow(''),
        country: Joi.string().allow('')
      }).allow(null)
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // UUID param
  uuidParam: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  }
}

module.exports = clientsValidation
