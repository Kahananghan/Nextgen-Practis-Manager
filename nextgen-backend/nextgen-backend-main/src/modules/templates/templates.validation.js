// ============================================
// src/modules/templates/templates.validation.js
// ============================================
const Joi = require('joi')

const taskTemplateSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().allow('', null).max(1000),
  estimatedHours: Joi.number().min(0).allow(null),
  sortOrder: Joi.number().integer().min(0)
})

module.exports = {
  createTemplate: {
    body: Joi.object({
      name: Joi.string().required().max(255),
      description: Joi.string().allow('', null).max(1000),
      category: Joi.string().max(100),
      isPublic: Joi.boolean().default(false),
      tasks: Joi.array().items(taskTemplateSchema).default([])
    })
  },
  updateTemplate: {
    body: Joi.object({
      name: Joi.string().max(255),
      description: Joi.string().allow('', null).max(1000),
      category: Joi.string().max(100),
      isPublic: Joi.boolean(),
      tasks: Joi.array().items(taskTemplateSchema)
    }).min(1)
  },
  createJobFromTemplate: {
    body: Joi.object({
      name: Joi.string().required().max(255),
      clientId: Joi.string().uuid().required(),
      startDate: Joi.date().iso().allow(null),
      dueDate: Joi.date().iso().allow(null),
      assignedStaffId: Joi.string().uuid().allow(null),
      managerId: Joi.string().uuid().allow(null),
      priority: Joi.string().valid('Low', 'Normal', 'Medium', 'High').default('Normal')
    })
  },
  uuidParam: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  }
}
