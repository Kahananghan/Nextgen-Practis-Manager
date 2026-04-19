// ============================================
// src/modules/staff/staff.validation.js
// ============================================
const Joi = require('joi')

module.exports = {
  getStaff: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      search: Joi.string().max(255),
      isActive: Joi.boolean().default(true),
      sortBy: Joi.string().valid('name', 'email', 'role', 'created_at'),
      sortOrder: Joi.string().valid('ASC', 'DESC')
    })
  },
  createStaff: {
    body: Joi.object({
      name: Joi.string().required().max(255),
      email: Joi.string().email().allow('', null).max(255),
      phone: Joi.string().allow('', null).max(50),
      role: Joi.string().allow('', null).max(100)
    })
  },
  updateStaff: {
    body: Joi.object({
      name: Joi.string().max(255),
      email: Joi.string().email().allow('', null).max(255),
      phone: Joi.string().allow('', null).max(50),
      role: Joi.string().allow('', null).max(100)
    }).min(1)
  },
  uuidParam: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  }
}
