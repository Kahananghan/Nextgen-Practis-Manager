// ============================================
// src/modules/recurrence/recurrence.routes.js
// Job Recurrence Management Routes
// ============================================
const recurrenceController = require('./recurrence.controller')
const Joi = require('joi')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')

async function recurrenceRoutes(fastify, options) {
  // Create recurrence pattern
  fastify.post('/patterns', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      body: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          frequency: { type: 'string' },
          intervalDaysBeforeDue: { type: 'number' },
          autoAssignToSameStaff: { type: 'boolean' },
          requireReviewBeforeCompletion: { type: 'boolean' },
          useSameTemplateTasks: { type: 'boolean' },
          notifyAssigneeOnCreation: { type: 'boolean' },
          notifyManagerOnCreation: { type: 'boolean' }
        }
      },
      description: 'Create a new recurrence pattern',
      tags: ['Recurrence'],
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, recurrenceController.createRecurrencePattern)

  // Get recurrence patterns
  fastify.get('/patterns', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get recurrence patterns with pagination',
      tags: ['Recurrence'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          jobId: { type: 'string' },
          isActive: { type: 'boolean' },
          frequency: { type: 'string' }
        }
      }},
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
  }, recurrenceController.getRecurrencePatterns)

  // Update recurrence pattern
  fastify.put('/patterns/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update a recurrence pattern',
      tags: ['Recurrence'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          frequency: { type: 'string' },
          intervalDaysBeforeDue: { type: 'number' },
          autoAssignToSameStaff: { type: 'boolean' },
          requireReviewBeforeCompletion: { type: 'boolean' },
          useSameTemplateTasks: { type: 'boolean' },
          notifyAssigneeOnCreation: { type: 'boolean' },
          notifyManagerOnCreation: { type: 'boolean' },
          isActive: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, recurrenceController.updateRecurrencePattern)

  // Delete recurrence pattern
  fastify.delete('/patterns/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete a recurrence pattern',
      tags: ['Recurrence'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, recurrenceController.deleteRecurrencePattern)

  // Process due recurrences (manual trigger)
  fastify.post('/process-due', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Process due recurrence patterns manually',
      tags: ['Recurrence'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    }
  }, recurrenceController.processDueRecurrences)

  // Get recurrence preview
  fastify.get('/preview', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get preview of next recurrence creation',
      tags: ['Recurrence'],
      querystring: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          recurrencePatternId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, recurrenceController.getRecurrencePreview)
}

module.exports = recurrenceRoutes
