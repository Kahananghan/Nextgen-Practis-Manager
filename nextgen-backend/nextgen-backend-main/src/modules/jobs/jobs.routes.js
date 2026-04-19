// ============================================
// src/modules/jobs/jobs.routes.js
// ============================================
const jobsController = require('./jobs.controller')
const jobsValidation = require('./jobs.validation')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')
const { checkLimit } = require('../../middleware/plan-guard')

async function jobsRoutes(fastify, options) {
  /**
   * @route GET /jobs
   * @desc Get jobs list with filtering and pagination
   * @access Private
   */
  fastify.get('/', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get jobs list with filtering, search, and pagination',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //querystring: jobsValidation.getJobs.query,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                jobs: { type: 'array' },
                pagination: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, jobsController.getJobs)

  /**
   * @route GET /jobs/:id
   * @desc Get single job with tasks
   * @access Private
   */
  fastify.get('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get single job by ID with all tasks',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
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
  }, jobsController.getJobById)

  /**
   * @route POST /jobs
   * @desc Create new job
   * @access Private
   */
  fastify.post('/', {
    preHandler: [authenticate, ensureTenantIsolation, checkLimit('jobs_per_month')],
    schema: {
      description: 'Create new job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //body: jobsValidation.createJob.body,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.createJob)

  /**
   * @route PUT /jobs/:id
   * @desc Update job
   * @access Private
   */
  fastify.put('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update job details',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
      //body: jobsValidation.updateJob.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.updateJob)

  /**
   * @route DELETE /jobs/:id
   * @desc Delete job
   * @access Private
   */
  fastify.delete('/:id', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete job (and all its tasks)',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.deleteJob)

  /**
   * @route PUT /jobs/:id/assign
   * @desc Assign job to staff member
   * @access Private
   */
  fastify.put('/:id/assign', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Assign job to staff member',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
      //body: jobsValidation.assignJob.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.assignJob)

  /**
   * @route GET /jobs/:id/tasks
   * @desc Get all tasks for a job
   * @access Private
   */
  fastify.get('/:id/tasks', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get all tasks for a job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tasks: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, jobsController.getTasks)

  /**
   * @route POST /jobs/:id/tasks
   * @desc Add task to job
   * @access Private
   */
  fastify.post('/:id/tasks', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Add new task to job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.uuidParam.params,
      //body: jobsValidation.addTask.body,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.addTask)

  /**
   * @route PUT /jobs/:id/tasks/:taskId
   * @desc Update task
   * @access Private
   */
  fastify.put('/:id/tasks/:taskId', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update task details',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.taskParams.params,
      //body: jobsValidation.updateTask.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.updateTask)

  /**
   * @route PUT /jobs/:id/tasks/:taskId/complete
   * @desc Toggle task completion status
   * @access Private
   */
  fastify.put('/:id/tasks/:taskId/complete', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Mark task as completed or incomplete',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.taskParams.params,
      //body: jobsValidation.toggleTaskCompletion.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.toggleTaskCompletion)

  /**
   * @route DELETE /jobs/:id/tasks/:taskId
   * @desc Delete task
   * @access Private
   */
  fastify.delete('/:id/tasks/:taskId', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete task from job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      //params: jobsValidation.taskParams.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, jobsController.deleteTask)

      /**
     * @route POST /jobs/:id/notes
     * @desc Create notes for a job
     * @access Private
     */
    fastify.post('/:id/notes', {
      preHandler: [authenticate, ensureTenantIsolation],
      schema: {
        description: 'Add a note for a job',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { 
                type: 'object',
                additionalProperties: true 
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, jobsController.addJobNote)

    /**
     * @route GET /jobs/:id/notes
     * @desc Get notes for a job
     * @access Private
     */
    fastify.get('/:id/notes', {
      preHandler: [authenticate, ensureTenantIsolation],
      schema: {
        description: 'Get notes for a job',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean',},
              data: { 
                type: 'object',
                additionalProperties: true
              }
            }
          }
        }
      }
    }, jobsController.getJobNotes)

    /**
     * @route PUT /jobs/:id/notes
     * @desc Update notes for a job
     * @access Private
     */
    fastify.put('/:id/notes', {
      preHandler: [authenticate, ensureTenantIsolation],
      schema: {
        description: 'Update notes for a job',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { 
                type: 'object',
                additionalProperties: true
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, jobsController.updateJobNote)

    /**
     * @route DELETE /jobs/:id/notes
     * @desc Delete notes for a job
     * @access Private
     */
    fastify.delete('/:id/notes', {
      preHandler: [authenticate, ensureTenantIsolation],
      schema: {
        description: 'Delete notes for a job',
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { 
                type: 'object',
                additionalProperties: true
              },
              message: { type: 'string' }
            }
          }
        }
      }
    }, jobsController.deleteJobNote)
}

module.exports = jobsRoutes
