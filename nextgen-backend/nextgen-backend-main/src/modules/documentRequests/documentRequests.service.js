// ============================================
// src/modules/documentRequests/documentRequests.service.js
// Document Requests Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError, ValidationError } = require('../../utils/errors')
const emailService = require('../../utils/emailService')
const { createR2Client } = require('../../config/r2')
const config = require('../../config')
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const crypto = require('crypto')
const path = require('path')
const { Readable } = require('stream')

const r2 = createR2Client()

function safeFilename(originalName) {
  const base = path.basename(originalName || 'file')
  return base.replace(/[^\w.\-()+@]/g, '_')
}

function validateFileType(fileTypes, mimetype, filename) {
  // If fileTypes is not set or 'any' is true, allow all
  if (!fileTypes || fileTypes.any === true) {
    return { valid: true }
  }

  const ext = path.extname(filename).toLowerCase()
  
  // Map file extensions and mimetypes to file type categories
  const typeMap = {
    pdf: { exts: ['.pdf'], mimes: ['application/pdf'] },
    excel: { exts: ['.xls', '.xlsx', '.csv'], mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'] },
    word: { exts: ['.doc', '.docx'], mimes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    image: { exts: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'], mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'] }
  }

  const allowedTypes = []
  
  for (const [type, config] of Object.entries(typeMap)) {
    if (fileTypes[type] === true) {
      // Check extension
      if (config.exts.includes(ext)) {
        return { valid: true }
      }
      // Check mimetype
      if (mimetype && config.mimes.some(m => mimetype.toLowerCase().includes(m.toLowerCase()))) {
        return { valid: true }
      }
      allowedTypes.push(type)
    }
  }

  return { 
    valid: false, 
    message: `Invalid file type. Allowed types: ${allowedTypes.join(', ') || 'none configured'}` 
  }
}

function makeObjectKey(tenantId, documentRequestId, originalName) {
  const id = crypto.randomUUID()
  return `document-portal/${tenantId}/${documentRequestId}/${id}-${safeFilename(originalName)}`
}

class DocumentRequestsService {
  /**
   * Generate presigned URL for file access
   * @param {string} fileUrl - Full R2 file URL
   * @param {number} expiresInSeconds - URL expiration time
   * @returns {string} - Presigned URL
   */
  async generatePresignedUrl(fileUrl, expiresInSeconds = 3600) {
    if (!fileUrl) return null
    try {
      const objectKey = fileUrl.replace(`${config.r2.endpoint}/`, '')
      const cmd = new GetObjectCommand({
        Bucket: config.r2.bucketName,
        Key: objectKey
      })
      return await getSignedUrl(r2, cmd, { expiresIn: expiresInSeconds })
    } catch (error) {
      logger.error({
        event: 'GENERATE_PRESIGNED_URL_ERROR',
        fileUrl,
        error: error.message
      })
      return null
    }
  }

  /**
   * Get document requests for a job
   * @param {string} tenantId - Tenant ID
   * @param {object} filters - Filter options
   * @returns {object} - Document requests list
   */
  async getDocumentRequests(tenantId, filters = {}) {
    try {
      const { jobId, clientId, status, page = 1, limit = 50 } = filters
      const offset = (page - 1) * limit

      let whereClause = 'WHERE dr.tenant_id = $1'
      const queryParams = [tenantId]
      let paramIndex = 2

      if (jobId) {
        whereClause += ` AND dr.job_id = $${paramIndex}`
        queryParams.push(jobId)
        paramIndex++
      }

      if (clientId) {
        whereClause += ` AND dr.client_id = $${paramIndex}`
        queryParams.push(clientId)
        paramIndex++
      }

      if (status) {
        whereClause += ` AND dr.status = $${paramIndex}`
        queryParams.push(status)
        paramIndex++
      }

      const query = `
        SELECT 
          dr.*,
          j.name as job_name,
          j.client_id,
          c.name as client_name,
          c.email as client_email,
          s.name as staff_name,
          s.email as staff_email
        FROM document_requests dr
        LEFT JOIN xpm_jobs j ON dr.job_id = j.id AND dr.tenant_id = j.tenant_id
        LEFT JOIN xpm_clients c ON dr.client_id = c.id AND dr.tenant_id = c.tenant_id
        LEFT JOIN xpm_staff s ON dr.assigned_staff_id = s.id AND dr.tenant_id = s.tenant_id
        ${whereClause}
        ORDER BY dr.due_date ASC, dr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      queryParams.push(limit, offset)

      const result = await db.query(query, queryParams)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM document_requests dr
        ${whereClause}
      `

      const countResult = await db.query(countQuery, queryParams.slice(0, -2))
      const total = parseInt(countResult.rows[0].total)

      // Compute actual status for each document and update DB if changed
      const documentsWithComputedStatus = await Promise.all(
        result.rows.map(async (doc) => {
          const actualStatus = await this.computeAndUpdateStatus(tenantId, doc)
          return {
            ...doc,
            status: actualStatus
          }
        })
      )

      return {
        data: documentsWithComputedStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      logger.error({
        event: 'GET_DOCUMENT_REQUESTS_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Compute actual status considering due date
   * If pending and due date has passed, return overdue
   * @param {string} dbStatus - Status from database
   * @param {string} dueDate - Due date string
   * @returns {string} - Actual status
   */
  computeActualStatus(dbStatus, dueDate) {
    if (dbStatus === 'pending') {
      const due = new Date(dueDate)
      const today = new Date()
      // Reset time to compare dates only
      due.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      if (due < today) {
        return 'overdue'
      }
    }
    return dbStatus
  }

  /**
   * Update document request status in database if it differs from computed
   * @param {string} tenantId - Tenant ID
   * @param {object} doc - Document request object
   * @returns {string} - Actual status
   */
  async computeAndUpdateStatus(tenantId, doc) {
    const actualStatus = this.computeActualStatus(doc.status, doc.due_date)
    
    // Update database if status changed from pending to overdue
    if (actualStatus !== doc.status && doc.id) {
      try {
        await db.query(
          'UPDATE document_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [actualStatus, doc.id, tenantId]
        )
      } catch (error) {
        logger.warn({
          event: 'STATUS_UPDATE_FAILED',
          documentId: doc.id,
          error: error.message
        })
      }
    }
    
    return actualStatus
  }

  /**
   * Create a new document request
   * @param {string} tenantId - Tenant ID
   * @param {object} documentRequestData - Document request data
   * @returns {object} - Created document request
   */
  async createDocumentRequest(tenantId, documentRequestData) {
    try {
      const {
        jobId,
        clientId,
        name,
        description,
        dueDate,
        priority = 'normal',
        reminder = '3days',
        fileTypes = {},
        notifyClient = true,
        assignedStaffId
      } = documentRequestData

      const effectiveDueDate = dueDate || new Date().toISOString().split('T')[0]

      // Validate required fields
      if (!name) {
        throw new ValidationError('Document request name is required')
      }

      if (!jobId && !clientId) {
        throw new ValidationError('Either job ID or client ID is required')
      }

      // Get job details if jobId provided
      let jobClientId = clientId
      if (jobId) {
        const jobResult = await db.query(
          'SELECT client_id, name FROM xpm_jobs WHERE id = $1 AND tenant_id = $2',
          [jobId, tenantId]
        )
        
        if (jobResult.rows.length === 0) {
          throw new NotFoundError('Job not found')
        }
        
        jobClientId = jobResult.rows[0].client_id
      }

      // Generate portal link that expires at end of due date (23:59:59)
      const crypto = require('crypto')
      const portalToken = crypto.randomBytes(16).toString('hex')
      const portalUrl = `portal.practismanager.com/${portalToken}`
      const portalExpiresAtDate = new Date(effectiveDueDate)
      portalExpiresAtDate.setHours(23, 59, 59, 999)
      const portalExpiresAt = portalExpiresAtDate

      // Create document request with portal link
      const query = `
        INSERT INTO document_requests (
          tenant_id, job_id, client_id, name, description, due_date,
          priority, reminder_settings, file_types, notify_client,
          assigned_staff_id, status, portal_token, portal_url, portal_expires_at, portal_is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        )
        RETURNING *
      `

      const values = [
        tenantId,
        jobId || null,
        jobClientId,
        name,
        description || '',
        effectiveDueDate,
        priority,
        reminder,
        fileTypes || {},
        notifyClient,
        assignedStaffId || null,
        'pending',
        portalToken,
        portalUrl,
        portalExpiresAt,
        true
      ]

      const result = await db.query(query, values)
      const createdRequest = result.rows[0]

      // Send notification if requested
      if (notifyClient && jobClientId) {
        try {
          // Get client details for email
          const clientResult = await db.query(
            'SELECT name, email FROM xpm_clients WHERE id = $1 AND tenant_id = $2',
            [jobClientId, tenantId]
          );
          
          // Get job name if jobId is provided
          let jobName = '';
          if (jobId) {
            const jobResult = await db.query(
              'SELECT name FROM xpm_jobs WHERE id = $1 AND tenant_id = $2',
              [jobId, tenantId]
            );
            if (jobResult.rows.length > 0) {
              jobName = jobResult.rows[0].name;
            }
          }
          
          if (clientResult.rows.length > 0) {
            const client = clientResult.rows[0];
            const notificationData = {
              ...createdRequest,
              client_name: client.name,
              client_email: client.email,
              job_name: jobName
            };
            await this.sendDocumentRequestNotification(tenantId, notificationData);
          }
        } catch (notificationError) {
          logger.warn({
            event: 'DOCUMENT_REQUEST_NOTIFICATION_FAILED',
            tenantId,
            documentRequestId: createdRequest.id,
            error: notificationError.message
          })
        }
      }

      logger.info({
        event: 'DOCUMENT_REQUEST_CREATED',
        tenantId,
        documentRequestId: createdRequest.id,
        jobId,
        clientId: jobClientId,
        name,
        portalUrl,
        portalExpiresAt
      })

      return createdRequest
    } catch (error) {
      logger.error({
        event: 'CREATE_DOCUMENT_REQUEST_ERROR',
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Send reminder for document request
   * @param {string} tenantId - Tenant ID
   * @param {string} documentRequestId - Document request ID
   * @returns {object} - Updated document request
   */
  async sendReminder(tenantId, documentRequestId) {
    try {
      // Get document request details
      const result = await db.query(
        `SELECT dr.*, c.name as client_name, c.email as client_email
         FROM document_requests dr
         LEFT JOIN xpm_clients c ON dr.client_id = c.id AND dr.tenant_id = c.tenant_id
         WHERE dr.id = $1 AND dr.tenant_id = $2`,
        [documentRequestId, tenantId]
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('Document request not found')
      }

      let documentRequest = result.rows[0]

      // Fallback: If client email is null, try to get it separately
      if (!documentRequest.client_email && documentRequest.client_id) {
        logger.warn({
          event: 'CLIENT_EMAIL_NULL_FALLBACK',
          tenantId,
          documentRequestId,
          clientId: documentRequest.client_id
        });
        
        const clientResult = await db.query(
          'SELECT name, email FROM xpm_clients WHERE id = $1 AND tenant_id = $2',
          [documentRequest.client_id, tenantId]
        );
        
        if (clientResult.rows.length > 0) {
          documentRequest.client_name = clientResult.rows[0].name;
          documentRequest.client_email = clientResult.rows[0].email;
        }
      }

      logger.info({
        event: 'DOCUMENT_REQUEST_RETRIEVED_FOR_REMINDER',
        tenantId,
        documentRequestId,
        clientId: documentRequest.client_id,
        clientName: documentRequest.client_name,
        clientEmail: documentRequest.client_email,
        hasClientEmail: !!documentRequest.client_email
      });

      // Update reminder count and last reminder sent
      const updateQuery = `
        UPDATE document_requests 
        SET reminder_count = COALESCE(reminder_count, 0) + 1,
            last_reminder_sent = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `

      const updateResult = await db.query(updateQuery, [documentRequestId, tenantId])
      const updatedRequest = updateResult.rows[0]

      // Send email notification
      try {
        await this.sendReminderEmail(tenantId, documentRequest)
      } catch (emailError) {
        logger.warn({
          event: 'REMINDER_EMAIL_FAILED',
          tenantId,
          documentRequestId,
          error: emailError.message
        })
      }

      logger.info({
        event: 'DOCUMENT_REQUEST_REMINDER_SENT',
        tenantId,
        documentRequestId,
        reminderCount: updatedRequest.reminder_count
      })

      return updatedRequest
    } catch (error) {
      logger.error({
        event: 'SEND_REMINDER_ERROR',
        tenantId,
        documentRequestId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Update document request status
   * @param {string} tenantId - Tenant ID
   * @param {string} documentRequestId - Document request ID
   * @param {string} status - New status
   * @param {object} updateData - Additional update data
   * @returns {object} - Updated document request
   */
  async updateDocumentRequestStatus(tenantId, documentRequestId, status, updateData = {}) {
    try {
      const validStatuses = ['pending', 'uploaded', 'overdue', 'cancelled']
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status')
      }

      let setClause = 'status = $3, updated_at = NOW()'
      const queryParams = [tenantId, documentRequestId, status]
      let paramIndex = 4

      // Handle file upload
      if (status === 'uploaded' && updateData.fileName) {
        setClause += `, file_name = $${paramIndex}, uploaded_at = NOW()`
        queryParams.push(updateData.fileName)
        paramIndex++
      }

      const query = `
        UPDATE document_requests 
        SET ${setClause}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `

      const result = await db.query(query, queryParams)

      if (result.rows.length === 0) {
        throw new NotFoundError('Document request not found')
      }

      const updatedRequest = result.rows[0]

      logger.info({
        event: 'DOCUMENT_REQUEST_STATUS_UPDATED',
        tenantId,
        documentRequestId,
        status,
        fileName: updateData.fileName
      })

      return updatedRequest
    } catch (error) {
      logger.error({
        event: 'UPDATE_DOCUMENT_REQUEST_STATUS_ERROR',
        tenantId,
        documentRequestId,
        status,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Delete document request
   * @param {string} tenantId - Tenant ID
   * @param {string} documentRequestId - Document request ID
   * @returns {boolean} - Success status
   */
  async deleteDocumentRequest(tenantId, documentRequestId) {
    try {
      const result = await db.query(
        'DELETE FROM document_requests WHERE id = $1 AND tenant_id = $2',
        [documentRequestId, tenantId]
      )

      if (result.rowCount === 0) {
        throw new NotFoundError('Document request not found')
      }

      logger.info({
        event: 'DOCUMENT_REQUEST_DELETED',
        tenantId,
        documentRequestId
      })

      return true
    } catch (error) {
      logger.error({
        event: 'DELETE_DOCUMENT_REQUEST_ERROR',
        tenantId,
        documentRequestId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Send document request notification email
   * @param {string} tenantId - Tenant ID
   * @param {object} documentRequest - Document request data
   */
  async sendDocumentRequestNotification(tenantId, documentRequest) {
    try {
      const clientEmail = documentRequest.client_email
      if (!clientEmail) {
        throw new Error('Client email not found')
      }

      const subject = `Document Request: ${documentRequest.name}`
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #6366f1; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Document Request</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${documentRequest.client_name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              We need the following document${documentRequest.job_name ? ` for your job <strong>${documentRequest.job_name}</strong>` : ''}:
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 10px;">${documentRequest.name}</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">${documentRequest.description || 'No description provided'}</p>
              
              <div style="display: flex; gap: 20px; color: #6b7280; font-size: 14px;">
                <div>
                  <strong>Due Date:</strong> ${new Date(documentRequest.due_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Priority:</strong> ${documentRequest.priority}
                </div>
              </div>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
              Please upload the requested document by the due date. If you have any questions, please don't hesitate to contact us.
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_PORTAL_URL || 'http://localhost:5173'}/#/portal/${documentRequest.portal_token}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Upload Document
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `

      await emailService.sendMail(clientEmail, subject, emailBody)

      logger.info({
        event: 'DOCUMENT_REQUEST_NOTIFICATION_SENT',
        tenantId,
        documentRequestId: documentRequest.id,
        clientEmail
      })
    } catch (error) {
      logger.error({
        event: 'SEND_DOCUMENT_REQUEST_NOTIFICATION_ERROR',
        tenantId,
        documentRequestId: documentRequest.id,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Send reminder email
   * @param {string} tenantId - Tenant ID
   * @param {object} documentRequest - Document request data
   */
  async sendReminderEmail(tenantId, documentRequest) {
    try {
      const clientEmail = documentRequest.client_email
      if (!clientEmail || clientEmail.trim() === '') {
        logger.warn({
          event: 'REMINDER_EMAIL_NO_CLIENT_EMAIL',
          tenantId,
          documentRequestId: documentRequest.id,
          clientId: documentRequest.client_id,
          clientName: documentRequest.client_name,
          clientEmail: documentRequest.client_email,
          clientEmailType: typeof clientEmail,
          clientEmailLength: clientEmail ? clientEmail.length : 'null'
        });
        throw new Error('Client email not found')
      }

      const subject = `Reminder: Document Request - ${documentRequest.name}`
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Reminder</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${documentRequest.client_name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              This is a friendly reminder that we're still waiting for the following document:
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 10px;">${documentRequest.name}</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">${documentRequest.description || 'No description provided'}</p>
              
              <div style="display: flex; gap: 20px; color: #6b7280; font-size: 14px;">
                <div>
                  <strong>Due Date:</strong> ${new Date(documentRequest.due_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Priority:</strong> ${documentRequest.priority}
                </div>
                <div>
                  <strong>Reminders Sent:</strong> ${documentRequest.reminder_count || 1}
                </div>
              </div>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
              Please upload the requested document as soon as possible. If you've already sent the document, please disregard this reminder.
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_PORTAL_URL || 'http://localhost:5173'}/#/portal/${documentRequest.portal_token}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Upload Document Now
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `

      // Add timeout wrapper to prevent hanging
      await emailService.sendMail(clientEmail, subject, emailBody)

      logger.info({
        event: 'REMINDER_EMAIL_SENT',
        tenantId,
        documentRequestId: documentRequest.id,
        clientEmail,
        reminderCount: documentRequest.reminder_count
      })
    } catch (error) {
      logger.error({
        event: 'SEND_REMINDER_EMAIL_ERROR',
        tenantId,
        documentRequestId: documentRequest.id,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }


  /**
   * Get portal data by token (public access)
   * @param {string} portalToken - Portal access token
   * @returns {object} - Portal data including job and documents
   */
  async getPortalData(portalToken) {
    try {
      // Find document request by portal token
      const result = await db.query(
        `SELECT dr.*, 
                j.name as job_name, 
                j.id as job_id,
                c.name as client_name,
                c.email as client_email
         FROM document_requests dr
         LEFT JOIN xpm_jobs j ON dr.job_id = j.id
         LEFT JOIN xpm_clients c ON dr.client_id = c.id
         WHERE dr.portal_token = $1 
         AND dr.portal_is_active = true`,
        [portalToken]
      )

      if (result.rows.length === 0) {
        throw new Error('Portal link not found')
      }

      const documentRequest = result.rows[0]

      // Check if portal has expired
      if (documentRequest.portal_expires_at && new Date(documentRequest.portal_expires_at) < new Date()) {
        throw new Error('Portal link expired')
      }

      // Get all documents for this job
      const documentsResult = await db.query(
        `SELECT dr.*
         FROM document_requests dr
         WHERE dr.job_id = $1 
         AND dr.portal_is_active = true
         ORDER BY dr.due_date ASC`,
        [documentRequest.job_id]
      )

      logger.info({
        event: 'PORTAL_DATA_ACCESSED',
        portalToken,
        jobId: documentRequest.job_id,
        clientId: documentRequest.client_id,
        documentCount: documentsResult.rows.length,
        documents: documentsResult.rows.map(d => ({ 
          id: d.id, 
          status: d.status, 
          file_name: d.file_name,
          has_file_url: !!d.file_url 
        }))
      })

      return {
        jobId: documentRequest.job_id,
        jobName: documentRequest.job_name,
        clientName: documentRequest.client_name,
        clientEmail: documentRequest.client_email,
        documents: documentsResult.rows,
        portalExpiresAt: documentRequest.portal_expires_at
      }
    } catch (error) {
      logger.error({
        event: 'GET_PORTAL_DATA_ERROR',
        portalToken,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Validate portal token and get job-level access
   * @param {string} portalToken - Portal access token from URL
   * @param {string} documentRequestId - Document request being uploaded to
   * @returns {object} - Document request if valid
   */
  async validatePortalToken(portalToken, documentRequestId) {
    try {
      logger.info({
        event: 'VALIDATE_PORTAL_TOKEN_START',
        portalToken,
        documentRequestId
      })

      // First, find ANY document with this portal token to get job access
      const tokenResult = await db.query(
        `SELECT dr.job_id, dr.portal_expires_at, dr.portal_is_active
         FROM document_requests dr
         WHERE dr.portal_token = $1
         AND dr.portal_is_active = true
         LIMIT 1`,
        [portalToken]
      )

      if (tokenResult.rows.length === 0) {
        logger.warn({
          event: 'VALIDATE_PORTAL_TOKEN_NOT_FOUND',
          portalToken
        })
        throw new Error('Invalid portal token')
      }

      const tokenDoc = tokenResult.rows[0]

      // Check if portal has expired
      if (tokenDoc.portal_expires_at && new Date(tokenDoc.portal_expires_at) < new Date()) {
        logger.warn({
          event: 'VALIDATE_PORTAL_TOKEN_EXPIRED',
          portalToken,
          expiresAt: tokenDoc.portal_expires_at
        })
        throw new Error('Portal link expired')
      }

      // Now get the specific document being uploaded to
      const docResult = await db.query(
        `SELECT dr.*, 
                j.name as job_name,
                c.name as client_name,
                c.email as client_email
         FROM document_requests dr
         LEFT JOIN xpm_jobs j ON dr.job_id = j.id
         LEFT JOIN xpm_clients c ON dr.client_id = c.id
         WHERE dr.id = $1 
         AND dr.job_id = $2`,
        [documentRequestId, tokenDoc.job_id]
      )

      if (docResult.rows.length === 0) {
        logger.warn({
          event: 'VALIDATE_PORTAL_TOKEN_DOC_NOT_IN_JOB',
          portalToken,
          documentRequestId,
          jobId: tokenDoc.job_id
        })
        throw new Error('Document request not found in this portal')
      }

      logger.info({
        event: 'VALIDATE_PORTAL_TOKEN_SUCCESS',
        portalToken,
        documentRequestId,
        jobId: tokenDoc.job_id
      })

      return docResult.rows[0]
    } catch (error) {
      logger.error({
        event: 'VALIDATE_PORTAL_TOKEN_ERROR',
        portalToken,
        documentRequestId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Upload file via portal and update document request
   * @param {object} documentRequest - Document request object
   * @param {object} file - Uploaded file object
   * @returns {object} - Updated document request
   */
  async uploadFileViaPortal(documentRequest, file) {
    try {
      // Validate file type against allowed types
      const fileTypes = typeof documentRequest.file_types === 'string' 
        ? JSON.parse(documentRequest.file_types) 
        : documentRequest.file_types || {}
      
      const validation = validateFileType(fileTypes, file.mimetype, file.filename)
      if (!validation.valid) {
        throw new ValidationError(validation.message)
      }

      // Use the buffer directly 
      const buffer = file.buffer
      
      // Generate unique object key for R2
      const objectKey = makeObjectKey(
        documentRequest.tenant_id,
        documentRequest.id,
        file.filename
      )

      // Upload to Cloudflare R2
      await r2.send(
        new PutObjectCommand({
          Bucket: config.r2.bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: file.mimetype || 'application/octet-stream',
          ContentLength: buffer.length
        })
      )

      // Construct R2 file URL
      const fileUrl = `${config.r2.endpoint}/${objectKey}`

      // Update document request status
      await db.query(
        `UPDATE document_requests 
         SET status = 'uploaded',
             file_name = $1,
             file_url = $2,
             uploaded_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [file.filename, fileUrl, documentRequest.id]
      )

      logger.info({
        event: 'PORTAL_FILE_UPLOADED',
        documentRequestId: documentRequest.id,
        tenantId: documentRequest.tenant_id,
        filename: file.filename,
        objectKey,
        fileUrl,
        size: buffer.length
      })

      return {
        id: documentRequest.id,
        fileName: file.filename,
        fileUrl,
        status: 'uploaded'
      }
    } catch (error) {
      logger.error({
        event: 'UPLOAD_FILE_VIA_PORTAL_ERROR',
        documentRequestId: documentRequest.id,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Regenerate portal link and send to client
   * @param {string} tenantId - Tenant ID
   * @param {string} documentRequestId - Document request ID
   * @returns {object} - Updated document request with new portal link
   */
  async regeneratePortalLink(tenantId, documentRequestId) {
    try {
      // Get document request with client details
      const result = await db.query(
        `SELECT dr.*, 
                c.name as client_name,
                c.email as client_email,
                j.name as job_name
         FROM document_requests dr
         LEFT JOIN xpm_clients c ON dr.client_id = c.id
         LEFT JOIN xpm_jobs j ON dr.job_id = j.id
         WHERE dr.id = $1 AND dr.tenant_id = $2`,
        [documentRequestId, tenantId]
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('Document request not found')
      }

      const documentRequest = result.rows[0]

      if (!documentRequest.client_email) {
        throw new Error('Client email not found')
      }

      // Generate new portal token
      const portalToken = crypto.randomBytes(16).toString('hex')
      const portalUrl = `portal.practismanager.com/${portalToken}`
      
      // Extend portal expiry by 3 days from existing expiry date (or today if already expired)
      const existingExpiry = documentRequest.portal_expires_at ? new Date(documentRequest.portal_expires_at) : new Date()
      const today = new Date()
      const baseDate = existingExpiry > today ? existingExpiry : today
      const portalExpiresAt = new Date(baseDate)
      portalExpiresAt.setDate(portalExpiresAt.getDate() + 3)
      portalExpiresAt.setHours(23, 59, 59, 999)

      // Update document request with new portal link
      await db.query(
        `UPDATE document_requests 
         SET portal_token = $1,
             portal_url = $2,
             portal_expires_at = $3,
             portal_is_active = true,
             updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5`,
        [portalToken, portalUrl, portalExpiresAt, documentRequestId, tenantId]
      )

      // Send email with new portal link
      const subject = `Document Request - ${documentRequest.name}`
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #6366f1; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Portal Link</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${documentRequest.client_name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              A new secure portal link has been generated for your document request:
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 10px;">${documentRequest.name}</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">${documentRequest.description || 'No description provided'}</p>
              
              <div style="display: flex; gap: 20px; color: #6b7280; font-size: 14px;">
                <div>
                  <strong>Due Date:</strong> ${new Date(documentRequest.due_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Priority:</strong> ${documentRequest.priority}
                </div>
              </div>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
              Please upload the requested document using your new secure link below:
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_PORTAL_URL || 'http://localhost:5173'}/#/portal/${portalToken}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Upload Document Now
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              <strong>Note:</strong> This link expires on ${new Date(portalExpiresAt).toLocaleDateString()}.
            </p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `

      await emailService.sendMail(documentRequest.client_email, subject, emailBody)

      logger.info({
        event: 'PORTAL_LINK_REGENERATED',
        tenantId,
        documentRequestId,
        clientEmail: documentRequest.client_email,
        newPortalUrl: portalUrl
      })

      return {
        id: documentRequestId,
        portalToken,
        portalUrl,
        portalExpiresAt,
        message: 'New portal link generated and sent to client'
      }
    } catch (error) {
      logger.error({
        event: 'REGENERATE_PORTAL_LINK_ERROR',
        tenantId,
        documentRequestId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}

module.exports = new DocumentRequestsService()
