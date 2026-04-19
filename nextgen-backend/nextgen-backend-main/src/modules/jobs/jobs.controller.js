const jobsService = require('./jobs.service')
const logger = require('../../utils/logger')

class JobsController {  
  /**
   * Get jobs list
   * GET /jobs
   */
  async getJobs(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const filters = request.query

      const result = await jobsService.getJobs(tenantId, filters)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'GET_JOBS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch jobs',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get single job
   * GET /jobs/:id
   */
  async getJobById(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const job = await jobsService.getJobById(id, tenantId)

      return reply.send({
        success: true,
        data: job
      })
    } catch (error) {
      logger.error({
        event: 'GET_JOB_BY_ID_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Create job
   * POST /jobs
   */
  async createJob(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const userId = request.user.id
      const jobData = request.body

      const job = await jobsService.createJob(tenantId, jobData, userId)

      return reply.code(201).send({
        success: true,
        data: job,
        message: 'Job created successfully'
      })
    } catch (error) {
      logger.error({
        event: 'CREATE_JOB_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Update job
   * PUT /jobs/:id
   */
  async updateJob(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId
      const updates = request.body

      const job = await jobsService.updateJob(id, tenantId, updates)

      return reply.send({
        success: true,
        data: job,
        message: 'Job updated successfully'
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_JOB_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Delete job
   * DELETE /jobs/:id
   */
  async deleteJob(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      await jobsService.deleteJob(id, tenantId)

      return reply.send({
        success: true,
        message: 'Job deleted successfully'
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_JOB_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Assign job to staff
   * PUT /jobs/:id/assign
   */
  async assignJob(request, reply) {
    try {
      const { id } = request.params
      const { staffId } = request.body
      const tenantId = request.user.tenantId

      const job = await jobsService.assignJob(id, tenantId, staffId)

      return reply.send({
        success: true,
        data: job,
        message: 'Job assigned successfully'
      })
    } catch (error) {
      logger.error({
        event: 'ASSIGN_JOB_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Get job tasks
   * GET /jobs/:id/tasks
   */
  async getTasks(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const tasks = await jobsService.getTasks(id, tenantId)

      return reply.send({
        success: true,
        data: { tasks }
      })
    } catch (error) {
      logger.error({
        event: 'GET_TASKS_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Add task to job
   * POST /jobs/:id/tasks
   */
  async addTask(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId
      const taskData = request.body

      const task = await jobsService.addTask(id, tenantId, taskData)

      return reply.code(201).send({
        success: true,
        data: task,
        message: 'Task added successfully'
      })
    } catch (error) {
      logger.error({
        event: 'ADD_TASK_CONTROLLER_ERROR',
        jobId: request.params.id,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Update task
   * PUT /jobs/:id/tasks/:taskId
   */
  async updateTask(request, reply) {
    try {
      const { id, taskId } = request.params
      const tenantId = request.user.tenantId
      const updates = request.body

      const task = await jobsService.updateTask(taskId, id, tenantId, updates)

      return reply.send({
        success: true,
        data: task,
        message: 'Task updated successfully'
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_TASK_CONTROLLER_ERROR',
        taskId: request.params.taskId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Toggle task completion
   * PUT /jobs/:id/tasks/:taskId/complete
   */
  async toggleTaskCompletion(request, reply) {
    try {
      const { id, taskId } = request.params
      const { isCompleted } = request.body
      const tenantId = request.user.tenantId

      const task = await jobsService.toggleTaskCompletion(taskId, id, tenantId, isCompleted)

      return reply.send({
        success: true,
        data: task,
        message: isCompleted ? 'Task marked as completed' : 'Task marked as incomplete'
      })
    } catch (error) {
      logger.error({
        event: 'TOGGLE_TASK_CONTROLLER_ERROR',
        taskId: request.params.taskId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Delete task
   * DELETE /jobs/:id/tasks/:taskId
   */
  async deleteTask(request, reply) {
    try {
      const { id, taskId } = request.params
      const tenantId = request.user.tenantId

      await jobsService.deleteTask(taskId, id, tenantId)

      return reply.send({
        success: true,
        message: 'Task deleted successfully'
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_TASK_CONTROLLER_ERROR',
        taskId: request.params.taskId,
        error: error.message
      })

      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      })
    }
  }

  /**
   * Add a note for a job
   * POST /jobs/:id/notes
   */
  async addJobNote(request, reply) {
    try {
      const { id } = request.params;
      const tenantId = request.user.tenantId;
      const { note } = request.body;
      const createdNote = await jobsService.addJobNote(id, tenantId, note);
      return reply.code(201).send({ success: true, data: createdNote, message: 'Note added successfully' });
    } catch (error) {
      logger.error({ event: 'ADD_JOB_NOTE_CONTROLLER_ERROR', jobId: request.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ success: false, error: { name: error.name || 'InternalServerError', message: error.message, statusCode } });
    }
  }

  /**
   * Get all notes for a job
   * GET /jobs/:id/notes
   */
  async getJobNotes(request, reply) {
    try {
      const { id } = request.params;
      const tenantId = request.user.tenantId;
      const notes = await jobsService.getJobNotes(id, tenantId);
      return reply.send({ success: true, data: { notes } });
    } catch (error) {
      logger.error({ event: 'GET_JOB_NOTES_CONTROLLER_ERROR', jobId: request.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ success: false, error: { name: error.name || 'InternalServerError', message: error.message, statusCode } });
    }
  }

  /**
   * Update a note for a job
   * PUT /jobs/:id/notes/:noteId
   */
  async updateJobNote(request, reply) {
    try {
      const { id, noteId } = request.params;
      const tenantId = request.user.tenantId;
      const { note } = request.body;
      const updatedNote = await jobsService.updateJobNote(noteId, id, tenantId, note);
      return reply.send({ success: true, data: updatedNote, message: 'Note updated successfully' });
    } catch (error) {
      logger.error({ event: 'UPDATE_JOB_NOTE_CONTROLLER_ERROR', jobId: request.params.id, noteId, error: error.message });
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ success: false, error: { name: error.name || 'InternalServerError', message: error.message, statusCode } });
    }
  }

  /**
   * Delete a note for a job
   * DELETE /jobs/:id/notes/:noteId
   */
  async deleteJobNote(request, reply) {
    try {
      const { id, noteId } = request.params;
      const tenantId = request.user.tenantId;
      await jobsService.deleteJobNote(noteId, id, tenantId);
      return reply.send({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
      logger.error({ event: 'DELETE_JOB_NOTE_CONTROLLER_ERROR', jobId: request.params.id, noteId, error: error.message });
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ success: false, error: { name: error.name || 'InternalServerError', message: error.message, statusCode } });
    }
  }
}

module.exports = new JobsController()
