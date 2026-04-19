// ============================================
// src/modules/chat/chat.controller.js - Chat Controller
// ============================================
const chatService = require('./chat.service')
const logger = require('../../utils/logger')
const db = require('../../config/database')

class ChatController {
  async listUsers(request, reply) {
    try {
      const { userId, tenantId } = request.user
      const users = await chatService.listUsers({
        tenantId,
        excludeUserId: userId
      })
      return reply.send({ success: true, data: { users } })
    } catch (error) {
      logger.error({ event: 'CHAT_LIST_USERS_ERROR', error: error.message })
      return reply.code(500).send({
        success: false,
        error: { name: 'InternalServerError', message: 'Failed to list users', statusCode: 500 }
      })
    }
  }

  async getHistory(request, reply) {
    try {
      const { userId, tenantId } = request.user
      const otherUserId = request.params.userId
      const messages = await chatService.getHistory({
        tenantId,
        userId,
        otherUserId,
        limit: Math.min(Number(request.query.limit || 200), 500)
      })
      return reply.send({ success: true, data: { messages } })
    } catch (error) {
      logger.error({ event: 'CHAT_GET_HISTORY_ERROR', error: error.message })
      return reply.code(500).send({
        success: false,
        error: { name: 'InternalServerError', message: 'Failed to fetch messages', statusCode: 500 }
      })
    }
  }

  async sendMessage(request, reply) {
    try {
      const { userId, tenantId } = request.user
      const { receiverId, message, fileKey } = request.body

      // Validate input
      if (!receiverId || (!message && !fileKey)) {
        return reply.code(400).send({
          success: false,
          error: { 
            name: 'ValidationError', 
            message: 'receiverId is required and either message or fileKey must be provided', 
            statusCode: 400 
          }
        })
      }

      // Verify receiver exists and is in same tenant
      const receiverCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
        [receiverId, tenantId]
      )
      
      if (receiverCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { 
            name: 'NotFoundError', 
            message: 'Receiver not found or not in same tenant', 
            statusCode: 404 
          }
        })
      }

      // Save message with fileKey
      const newMessage = await chatService.saveMessage({
        senderId: userId,
        receiverId,
        message,
        fileKey
      })

      return reply.send({ success: true, data: { message: newMessage } })
    } catch (error) {
      logger.error({ event: 'CHAT_SEND_MESSAGE_ERROR', error: error.message })
      return reply.code(500).send({
        success: false,
        error: { name: 'InternalServerError', message: 'Failed to send message', statusCode: 500 }
      })
    }
  }

  async upload(request, reply) {
    try {
      const part = await request.file()
      if (!part) {
        return reply.code(400).send({
          success: false,
          error: { name: 'ValidationError', message: 'Missing file', statusCode: 400 }
        })
      }

      const result = await chatService.uploadToR2({
        stream: part.file,
        contentType: part.mimetype,
        filename: part.filename
      })

      return reply.send({
        success: true,
        data: {
          file: {
            key: result.key,
            url: result.url
          }
        }
      })
    } catch (error) {
      logger.error({ event: 'CHAT_UPLOAD_ERROR', error: error.message })
      return reply.code(500).send({
        success: false,
        error: { name: 'InternalServerError', message: 'Upload failed', statusCode: 500 }
      })
    }
  }

  async deleteMessage(request, reply) {
    try {
      const { userId, tenantId } = request.user
      const { messageId } = request.params

      // Validate input
      if (!messageId) {
        return reply.code(400).send({
          success: false,
          error: { 
            name: 'ValidationError', 
            message: 'Message ID is required', 
            statusCode: 400 
          }
        })
      }

      // Check if message exists and the current user is either the sender or receiver
      const messageCheck = await db.query(
        `SELECT id, sender_id, receiver_id
        FROM messages
        WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)`,
        [messageId, userId]
      )

      if (messageCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { 
            name: 'NotFoundError', 
            message: 'Message not found or you do not have permission to delete it', 
            statusCode: 404 
          }
        })
      }

      // Delete the message
      await db.query(
        'DELETE FROM messages WHERE id = $1',
        [messageId]
      )

      return reply.send({
        success: true,
        message: 'Message deleted successfully'
      })
    } catch (error) {
      logger.error({ event: 'CHAT_DELETE_MESSAGE_ERROR', error: error.message })
      return reply.code(500).send({
        success: false,
        error: { name: 'InternalServerError', message: 'Failed to delete message', statusCode: 500 }
      })
    }
  }
}

module.exports = new ChatController()

