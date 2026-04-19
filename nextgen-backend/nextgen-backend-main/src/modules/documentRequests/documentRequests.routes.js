// ============================================
// src/modules/documentRequests/documentRequests.routes.js
// Document Requests Routes
// ============================================
const documentRequestsController = require('./documentRequests.controller')
const { authenticate } = require('../../middleware/auth')
const { ensureTenantIsolation } = require('../../middleware/tenant')  

async function documentRequestsRoutes(fastify, options) {
  // Get document requests
  fastify.get('/document-requests', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get document requests with filtering and pagination',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          clientId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'uploaded', 'overdue', 'cancelled'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenant_id: { type: 'string' },
                  job_id: { type: 'string' },
                  client_id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  due_date: { type: 'string' },
                  priority: { type: 'string' },
                  reminder_settings: { type: 'string' },
                  file_types: { type: 'string' },
                  notify_client: { type: 'boolean' },
                  assigned_staff_id: { type: 'string' },
                  status: { type: 'string' },
                  reminder_count: { type: 'integer' },
                  last_reminder_sent: { type: 'string' },
                  file_name: { type: 'string' },
                  file_url: { type: 'string'},
                  uploaded_at: { type: 'string' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                  job_name: { type: 'string' },
                  client_name: { type: 'string' },
                  client_email: { type: 'string' },
                  staff_name: { type: 'string' },
                  staff_email: { type: 'string' },
                  portal_url: { type: 'string' },
                  portal_expires_at: { type: 'string' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.getDocumentRequests)

  // Create document request
  fastify.post('/document-requests', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Create a new document request',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          jobId: { type: 'string' },
          clientId: { type: 'string' },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          dueDate: { type: 'string', format: 'date' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
          reminder: { type: 'string', enum: ['none', '1day', '3days', '7days', 'daily'], default: '3days' },
          fileTypes: {
            type: 'object',
            properties: {
              pdf: { type: 'boolean', default: true },
              excel: { type: 'boolean', default: true },
              word: { type: 'boolean', default: false },
              image: { type: 'boolean', default: false },
              any: { type: 'boolean', default: false }
            }
          },
          notifyClient: { type: 'boolean', default: true },
          assignedStaffId: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenant_id: { type: 'string' },
                job_id: { type: 'string' },
                client_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                due_date: { type: 'string' },
                priority: { type: 'string' },
                reminder_settings: { type: 'string' },
                file_types: { type: 'string' },
                notify_client: { type: 'boolean' },
                assigned_staff_id: { type: 'string' },
                status: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.createDocumentRequest)

  // Get document request by ID
  fastify.get('/document-requests/:documentRequestId', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get a specific document request by ID',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenant_id: { type: 'string' },
                job_id: { type: 'string' },
                client_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                due_date: { type: 'string' },
                priority: { type: 'string' },
                reminder_settings: { type: 'string' },
                file_types: { type: 'string' },
                notify_client: { type: 'boolean' },
                assigned_staff_id: { type: 'string' },
                status: { type: 'string' },
                reminder_count: { type: 'integer' },
                last_reminder_sent: { type: 'string' },
                file_name: { type: 'string' },
                uploaded_at: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
                job_name: { type: 'string' },
                client_name: { type: 'string' },
                client_email: { type: 'string' },
                staff_name: { type: 'string' },
                staff_email: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.getDocumentRequestById)

  // Send reminder for document request
  fastify.post('/document-requests/:documentRequestId/remind', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Send a reminder for a document request',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                reminder_count: { type: 'integer' },
                last_reminder_sent: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.sendReminder)

  // Update document request status
  fastify.patch('/document-requests/:documentRequestId/status', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Update document request status',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'uploaded', 'overdue', 'cancelled'] },
          fileName: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                file_name: { type: 'string' },
                uploaded_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        400: {
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
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.updateDocumentRequestStatus)

  // Delete document request
  fastify.delete('/document-requests/:documentRequestId', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Delete a document request',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
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
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.deleteDocumentRequest)

  // Get presigned file view URL
  fastify.get('/document-requests/:documentRequestId/file-url', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Get presigned URL to view uploaded file',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                fileUrl: { type: 'string' },
                fileName: { type: 'string' },
                expiresIn: { type: 'integer' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.getFileViewUrl)

  // Download file (backend proxy to avoid CORS)
  fastify.get('/document-requests/:documentRequestId/download', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Download uploaded file (proxied through backend)',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      }
    }
  }, documentRequestsController.downloadFile)

  // Public client portal endpoint - no authentication required
  fastify.get('/portal/:portalToken', {
    schema: {
      description: 'Get document requests by portal token (public access)',
      tags: ['Client Portal'],
      params: {
        type: 'object',
        required: ['portalToken'],
        properties: {
          portalToken: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                jobName: { type: 'string' },
                clientName: { type: 'string' },
                documents: { type: 'array' },
                portalExpiresAt: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        410: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.getPortalData)

  // Portal file upload endpoint - no authentication required
  fastify.post('/portal/upload', {
    schema: {
      description: 'Upload file via portal token (public access)',
      tags: ['Client Portal'],
      consumes: ['multipart/form-data'],
      // Note: Body validation disabled for multipart/form-data
      // Fields are validated manually in controller
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fileName: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.uploadPortalFile)

  // Regenerate portal link and send to client
  fastify.post('/document-requests/:documentRequestId/regenerate-portal', {
    preHandler: [authenticate, ensureTenantIsolation],
    schema: {
      description: 'Regenerate portal link and send to client',
      tags: ['Document Requests'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['documentRequestId'],
        properties: {
          documentRequestId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                portalToken: { type: 'string' },
                portalUrl: { type: 'string' },
                portalExpiresAt: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, documentRequestsController.regeneratePortalLink)
}

module.exports = documentRequestsRoutes
