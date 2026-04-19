// ============================================
// src/modules/jobs/jobs.validation.js
// ============================================
const Joi = require('joi')

const jobsValidation = {
  // Get jobs query params
  getJobs: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      state: Joi.string().valid('Planned', 'In Progress', 'On Hold', 'Complete'),
      priority: Joi.string().valid('Low', 'Normal', 'Medium', 'High'),
      clientId: Joi.string().uuid(),
      staffId: Joi.string().uuid(),
      search: Joi.string().max(255),
      sortBy: Joi.string().valid('due_date', 'created_at', 'name', 'state', 'priority'),
      sortOrder: Joi.string().valid('ASC', 'DESC')
    })
  },

  // Create job
  createJob: {
    body: Joi.object({
      name: Joi.string().required().max(255).messages({
        'any.required': 'Job name is required',
        'string.max': 'Job name must be less than 255 characters'
      }),
      description: Joi.string().allow('', null).max(2000),
      clientId: Joi.string().uuid().required().messages({
        'any.required': 'Client is required'
      }),
      jobType: Joi.string().max(100),
      category: Joi.string().max(100),
      state: Joi.string()
        .valid('Planned', 'In Progress', 'On Hold', 'Complete')
        .default('Planned'),
      priority: Joi.string()
        .valid('Low', 'Normal', 'Medium', 'High')
        .default('Normal'),
      startDate: Joi.date().iso().allow(null),
      dueDate: Joi.date().iso().allow(null).greater(Joi.ref('startDate')).messages({
        'date.greater': 'Due date must be after start date'
      }),
      budget: Joi.number().min(0).allow(null),
      assignedStaffId: Joi.string().uuid().allow(null),
      managerId: Joi.string().uuid().allow(null)
    })
  },

  // Update job
  updateJob: {
    body: Joi.object({
      name: Joi.string().max(255),
      description: Joi.string().allow('', null).max(2000),
      state: Joi.string().valid('Planned', 'In Progress', 'On Hold', 'Complete'),
      priority: Joi.string().valid('Low', 'Normal', 'Medium', 'High'),
      startDate: Joi.date().iso().allow(null),
      dueDate: Joi.date().iso().allow(null),
      budget: Joi.number().min(0).allow(null),
      assignedStaffId: Joi.string().uuid().allow(null),
      managerId: Joi.string().uuid().allow(null),
      jobType: Joi.string().max(100),
      category: Joi.string().max(100)
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // Assign job
  assignJob: {
    body: Joi.object({
      staffId: Joi.string().uuid().required().messages({
        'any.required': 'Staff ID is required'
      })
    })
  },

  // Add task
  addTask: {
    body: Joi.object({
      name: Joi.string().required().max(255).messages({
        'any.required': 'Task name is required'
      }),
      description: Joi.string().allow('', null).max(1000),
      sortOrder: Joi.number().integer().min(0).default(0)
    })
  },

  // Update task
  updateTask: {
    body: Joi.object({
      name: Joi.string().max(255),
      description: Joi.string().allow('', null).max(1000),
      sortOrder: Joi.number().integer().min(0)
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  // Toggle task completion
  toggleTaskCompletion: {
    body: Joi.object({
      isCompleted: Joi.boolean().required().messages({
        'any.required': 'isCompleted is required'
      })
    })
  },

  // UUID param validation
  uuidParam: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  },

  // UUID params for nested routes
  taskParams: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
      taskId: Joi.string().uuid().required()
    })
  }
}

module.exports = jobsValidation
