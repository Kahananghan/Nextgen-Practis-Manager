// ============================================
// src/modules/clients/clients.controller.js
// ============================================
const clientsService = require('./clients.service')
const logger = require('../../utils/logger')

class ClientsController {    
  /**
   * Get clients list
   * GET /clients
   */
  async getClients(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const filters = request.query

      const result = await clientsService.getClients(tenantId, filters)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'GET_CLIENTS_CONTROLLER_ERROR',
        tenantId: request.user.tenantId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch clients',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Get single client
   * GET /clients/:id
   */
  async getClientById(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const client = await clientsService.getClientById(id, tenantId)

      return reply.send({
        success: true,
        data: client
      })
    } catch (error) {
      logger.error({
        event: 'GET_CLIENT_BY_ID_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Get client's jobs
   * GET /clients/:id/jobs
   */
  async getClientJobs(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const jobs = await clientsService.getClientJobs(id, tenantId)

      return reply.send({
        success: true,
        data: { jobs }
      })
    } catch (error) {
      logger.error({
        event: 'GET_CLIENT_JOBS_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Create client
   * POST /clients
   */
  async createClient(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const clientData = request.body

      const client = await clientsService.createClient(tenantId, clientData)

      return reply.code(201).send({
        success: true,
        data: client,
        message: 'Client created successfully'
      })
    } catch (error) {
      logger.error({
        event: 'CREATE_CLIENT_CONTROLLER_ERROR',
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
   * Update client
   * PUT /clients/:id
   */
  async updateClient(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId
      const updates = request.body

      const client = await clientsService.updateClient(id, tenantId, updates)

      return reply.send({
        success: true,
        data: client,
        message: 'Client updated successfully'
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_CLIENT_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Archive client
   * PUT /clients/:id/archive
   */
  async archiveClient(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const client = await clientsService.toggleArchive(id, tenantId, true)

      return reply.send({
        success: true,
        data: client,
        message: 'Client archived successfully'
      })
    } catch (error) {
      logger.error({
        event: 'ARCHIVE_CLIENT_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Unarchive client
   * PUT /clients/:id/unarchive
   */
  async unarchiveClient(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      const client = await clientsService.toggleArchive(id, tenantId, false)

      return reply.send({
        success: true,
        data: client,
        message: 'Client unarchived successfully'
      })
    } catch (error) {
      logger.error({
        event: 'UNARCHIVE_CLIENT_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Delete client
   * DELETE /clients/:id
   */
  async deleteClient(request, reply) {
    try {
      const { id } = request.params
      const tenantId = request.user.tenantId

      await clientsService.deleteClient(id, tenantId)

      return reply.send({
        success: true,
        message: 'Client deleted successfully (archived)'
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_CLIENT_CONTROLLER_ERROR',
        clientId: request.params.id,
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
   * Add favourite client
   * POST /clients/:id/favourite
   */
   async addFavouriteClient(request, reply) {
    try {
      const userId = request.user.userId
      const clientId = request.params.id
      const fav = await clientsService.addFavouriteClient(userId, clientId)
      return reply.code(201).send({
        success: true,
        data: fav,
        message: 'Client added to favourites'
      })
    } catch (error) {
      logger.error({
        event: 'ADD_FAVOURITE_CLIENT_CONTROLLER_ERROR',
        userId,
        clientId,
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
   * Remove favourite client
   * DELETE /clients/:id/favourite
   */
  async removeFavouriteClient(request, reply) {
    try {
      const userId = request.user.userId;
      const clientId = request.params.id;
      const result = await clientsService.removeFavouriteClient(userId, clientId);
      return reply.send({
        success: true,
        data: result,
        message: 'Client removed from favourites'
      });
    } catch (error) {
      logger.error({
        event: 'REMOVE_FAVOURITE_CLIENT_CONTROLLER_ERROR',
        userId,
        clientId,
        error: error.message
      });
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: {
          name: error.name || 'InternalServerError',
          message: error.message,
          statusCode
        }
      });
    }
  }

  /**
   * Get favourite clients for a user
   * GET /clients/favourites
   */
  async getFavouriteClients(request, reply) {
    try {
      const userId = request.user.userId
      const favourites = await clientsService.getFavouriteClients(userId)
      return reply.send({
        success: true,
        data: favourites
      })
    } catch (error) {
      logger.error({
        event: 'GET_FAVOURITE_CLIENTS_CONTROLLER_ERROR',
        userId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch favourite clients',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new ClientsController()
