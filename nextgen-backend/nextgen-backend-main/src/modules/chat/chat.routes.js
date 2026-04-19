// ============================================
// src/modules/chat/chat.routes.js - Chat Routes
// ============================================
const chatController = require('./chat.controller')
const { authenticate } = require('../../middleware/auth')

async function chatRoutes(fastify) {
  /**
   * GET /users
   * List all users except current user
   */
  fastify.get('/users', {
    preHandler: authenticate,
    schema: {
      description: 'List chat users',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }]
    }
  }, chatController.listUsers)

  /**
   * GET /messages/:userId
   * Fetch 1:1 chat history with a user
   */
  fastify.get('/messages/:userId', {
    preHandler: authenticate,
    schema: {
      description: 'Get chat history with user',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string' } }
      },
      querystring: {
        type: 'object',
        properties: { limit: { type: 'number' } }
      }
    }
  }, chatController.getHistory)

  /**
   * POST /messages
   * Send a message to a user (HTTP fallback)
   */
  fastify.post('/messages', {
    preHandler: authenticate,
    schema: {
      description: 'Send message to user',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['receiverId'],
        properties: {
          receiverId: { type: 'string' },
          message: { type: 'string' },
          fileKey: { type: 'string' }
        }
      }
    }
  }, chatController.sendMessage)

  /**
   * POST /upload
   * Upload a file to Cloudflare R2 and return key + presigned URL
   */
  fastify.post('/upload', {
    preHandler: authenticate,
    schema: {
      description: 'Upload chat media to R2',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }]
    }
  }, chatController.upload)

  /**
   * DELETE /messages/:messageId
   * Delete a message
   */
  fastify.delete('/messages/:messageId', {
    preHandler: authenticate,
    schema: {
      description: 'Delete a message',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['messageId'],
        properties: { messageId: { type: 'string' } }
      }
    }
  }, chatController.deleteMessage)
}

module.exports = chatRoutes

