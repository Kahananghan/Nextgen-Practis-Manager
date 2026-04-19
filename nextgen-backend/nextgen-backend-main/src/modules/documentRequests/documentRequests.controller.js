// ============================================
// src/modules/documentRequests/documentRequests.controller.js
// Document Requests Controller
// ============================================
const documentRequestsService = require('./documentRequests.service')
const logger = require('../../utils/logger')
const { validateRequired, validateDate } = require('../../utils/validation')

class DocumentRequestsController {
  /**
   * Get document requests
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async getDocumentRequests(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const filters = {
        jobId: request.query.jobId,
        clientId: request.query.clientId,
        status: request.query.status,
        page: parseInt(request.query.page) || 1,
        limit: parseInt(request.query.limit) || 50
      }

      const result = await documentRequestsService.getDocumentRequests(tenantId, filters)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error) {
      logger.error({
        event: 'GET_DOCUMENT_REQUESTS_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        error: error.message,
        stack: error.stack
      })

      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch document requests',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Create document request
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async createDocumentRequest(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const documentRequestData = request.body

      // Validate required fields
      const validation = validateRequired(documentRequestData, ['name'])
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        })
      }

      // Validate date if provided
      if (documentRequestData.dueDate) {
        const dateValidation = validateDate(documentRequestData.dueDate)
        if (!dateValidation.isValid) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid due date',
            error: dateValidation.error
          })
        }
      }

      // Validate priority
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (documentRequestData.priority && !validPriorities.includes(documentRequestData.priority)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid priority. Must be one of: low, normal, high, urgent'
        })
      }

      // Validate reminder settings
      const validReminders = ['none', '1day', '3days', '7days', 'daily']
      if (documentRequestData.reminder && !validReminders.includes(documentRequestData.reminder)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid reminder setting. Must be one of: none, 1day, 3days, 7days, daily'
        })
      }

      const result = await documentRequestsService.createDocumentRequest(tenantId, documentRequestData)

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Document request created successfully'
      })
    } catch (error) {
      logger.error({
        event: 'CREATE_DOCUMENT_REQUEST_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        error: error.message,
        stack: error.stack
      })

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          success: false,
          message: error.message
        })
      }

      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to create document request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Send reminder for document request
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async sendReminder(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      const result = await documentRequestsService.sendReminder(tenantId, documentRequestId)

      return reply.send({
        success: true,
        data: result,
        message: 'Reminder sent successfully'
      })
    } catch (error) {
      logger.error({
        event: 'SEND_REMINDER_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to send reminder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Update document request status
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async updateDocumentRequestStatus(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params
      const { status } = request.body
      const updateData = request.body

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      if (!status) {
        return reply.status(400).send({
          success: false,
          message: 'Status is required'
        })
      }

      const result = await documentRequestsService.updateDocumentRequestStatus(
        tenantId, 
        documentRequestId, 
        status, 
        updateData
      )

      return reply.send({
        success: true,
        data: result,
        message: 'Document request status updated successfully'
      })
    } catch (error) {
      logger.error({
        event: 'UPDATE_DOCUMENT_REQUEST_STATUS_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        status: request.body.status,
        error: error.message,
        stack: error.stack
      })

      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          success: false,
          message: error.message
        })
      }

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to update document request status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Delete document request
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async deleteDocumentRequest(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      await documentRequestsService.deleteDocumentRequest(tenantId, documentRequestId)

      return reply.send({
        success: true,
        message: 'Document request deleted successfully'
      })
    } catch (error) {
      logger.error({
        event: 'DELETE_DOCUMENT_REQUEST_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to delete document request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Get document request by ID
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async getDocumentRequestById(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      const result = await documentRequestsService.getDocumentRequests(tenantId, {
        // We'll need to add this method to the service
      })

      // For now, get all requests and filter
      const allRequests = await documentRequestsService.getDocumentRequests(tenantId, {})
      const documentRequest = allRequests.data.find(req => req.id === documentRequestId)

      if (!documentRequest) {
        return reply.status(404).send({
          success: false,
          message: 'Document request not found'
        })
      }

      return reply.send({
        success: true,
        data: documentRequest
      })
    } catch (error) {
      logger.error({
        event: 'GET_DOCUMENT_REQUEST_BY_ID_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch document request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Get portal data by token (public access)
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async getPortalData(request, reply) {
    try {
      const { portalToken } = request.params

      const portalData = await documentRequestsService.getPortalData(portalToken)

      return reply.status(200).send({
        success: true,
        data: portalData
      })
    } catch (error) {
      logger.error({
        event: 'GET_PORTAL_DATA_CONTROLLER_ERROR',
        portalToken: request.params.portalToken,
        error: error.message,
        stack: error.stack
      })

      if (error.message === 'Portal link not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invalid portal link'
        })
      }

      if (error.message === 'Portal link expired') {
        return reply.status(410).send({
          success: false,
          message: 'This portal link has expired'
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch portal data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Upload file via portal (public access)
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async uploadPortalFile(request, reply) {
    try {
      // Parse multipart form data
      const parts = request.parts()
      let portalToken = null
      let documentRequestId = null
      let file = null

      for await (const part of parts) {
        if (part.type === 'file') {
          // Convert file to buffer immediately to avoid stream issues
          const buffer = await part.toBuffer()
          file = {
            ...part,
            buffer,
            file: buffer // Use buffer instead of stream
          }
        } else if (part.type === 'field') {
          const value = await part.value
          if (part.fieldname === 'portalToken') {
            portalToken = value
          } else if (part.fieldname === 'documentRequestId') {
            documentRequestId = value
          }
        }
      }

      if (!portalToken || !documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Missing portalToken or documentRequestId'
        })
      }

      if (!file) {
        return reply.status(400).send({
          success: false,
          message: 'No file provided'
        })
      }

      // Validate portal token and get document request
      const documentRequest = await documentRequestsService.validatePortalToken(
        portalToken, 
        documentRequestId
      )

      // Save file and update document request
      const result = await documentRequestsService.uploadFileViaPortal(
        documentRequest,
        file
      )

      return reply.status(200).send({
        success: true,
        message: 'File uploaded successfully',
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'UPLOAD_PORTAL_FILE_ERROR',
        error: error.message,
        stack: error.stack
      })

      if (error.message === 'Invalid portal token') {
        return reply.status(401).send({
          success: false,
          message: 'Invalid or expired portal link'
        })
      }

      if (error.message === 'Document request not found') {
        return reply.status(404).send({
          success: false,
          message: 'Document request not found'
        })
      }

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to upload file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Get presigned file view URL
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async getFileViewUrl(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      // Get document request to find the file URL
      const allRequests = await documentRequestsService.getDocumentRequests(tenantId, {})
      const documentRequest = allRequests.data.find(req => req.id === documentRequestId)

      if (!documentRequest) {
        return reply.status(404).send({
          success: false,
          message: 'Document request not found'
        })
      }

      if (!documentRequest.file_url) {
        return reply.status(404).send({
          success: false,
          message: 'No file uploaded for this document request'
        })
      }

      // Generate presigned URL
      const presignedUrl = await documentRequestsService.generatePresignedUrl(
        documentRequest.file_url,
        3600 // 1 hour expiration
      )

      if (!presignedUrl) {
        return reply.status(500).send({
          success: false,
          message: 'Failed to generate file access URL'
        })
      }

      return reply.send({
        success: true,
        data: {
          fileUrl: presignedUrl,
          fileName: documentRequest.file_name,
          expiresIn: 3600
        }
      })
    } catch (error) {
      logger.error({
        event: 'GET_FILE_VIEW_URL_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      return reply.status(500).send({
        success: false,
        message: 'Failed to generate file access URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

   /**
   * Download file (backend proxy to avoid CORS)
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async downloadFile(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      // Get document request to find the file URL
      const allRequests = await documentRequestsService.getDocumentRequests(tenantId, {})
      const documentRequest = allRequests.data.find(req => req.id === documentRequestId)

      if (!documentRequest) {
        return reply.status(404).send({
          success: false,
          message: 'Document request not found'
        })
      }

      if (!documentRequest.file_url) {
        return reply.status(404).send({
          success: false,
          message: 'No file uploaded for this document request'
        })
      }

      // Generate presigned URL
      const presignedUrl = await documentRequestsService.generatePresignedUrl(
        documentRequest.file_url,
        3600
      )

      if (!presignedUrl) {
        return reply.status(500).send({
          success: false,
          message: 'Failed to generate file access URL'
        })
      }

      // Fetch file from R2 and stream to client
      const fetch = (await import('node-fetch')).default
      const fileResponse = await fetch(presignedUrl)
      
      if (!fileResponse.ok) {
        return reply.status(500).send({
          success: false,
          message: 'Failed to fetch file from storage'
        })
      }

      // Set download headers
      const fileName = documentRequest.file_name || 'document'
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`)
      reply.header('Content-Type', fileResponse.headers.get('content-type') || 'application/octet-stream')
      
      // Stream file to client
      return reply.send(fileResponse.body)
    } catch (error) {
      logger.error({
        event: 'DOWNLOAD_FILE_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      return reply.status(500).send({
        success: false,
        message: 'Failed to download file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * Regenerate portal link and send to client
   * @param {object} request - Fastify request object
   * @param {object} reply - Fastify reply object
   */
  async regeneratePortalLink(request, reply) {
    try {
      const tenantId = request.user.tenantId
      const { documentRequestId } = request.params

      if (!documentRequestId) {
        return reply.status(400).send({
          success: false,
          message: 'Document request ID is required'
        })
      }

      const result = await documentRequestsService.regeneratePortalLink(tenantId, documentRequestId)

      return reply.send({
        success: true,
        data: result,
        message: 'New portal link generated and sent to client'
      })
    } catch (error) {
      logger.error({
        event: 'REGENERATE_PORTAL_LINK_CONTROLLER_ERROR',
        userId: request.user?.id,
        tenantId: request.user?.tenantId,
        documentRequestId: request.params.documentRequestId,
        error: error.message,
        stack: error.stack
      })

      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          success: false,
          message: error.message
        })
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to regenerate portal link',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

module.exports = new DocumentRequestsController()
