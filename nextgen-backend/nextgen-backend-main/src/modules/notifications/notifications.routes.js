// ============================================
// src/modules/notifications/notifications.routes.js
// ============================================
const notificationsController = require('./notifications.controller')
const { authenticate } = require('../../middleware/auth')
const Joi = require('joi')

async function notificationsRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Get user notifications',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      // querystring: Joi.object({
      //   unreadOnly: Joi.boolean(),
      //   limit: Joi.number().integer().min(1).max(100).default(50)
      // })
    }
  }, notificationsController.getNotifications)

  fastify.get('/unread-count', {
    preHandler: [authenticate],
    schema: {
      description: 'Get unread notification count',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }]
    }
  }, notificationsController.getUnreadCount)

  fastify.put('/:id/read', {
    preHandler: [authenticate],
    schema: {
      description: 'Mark notification as read',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      // params: Joi.object({
      //   id: Joi.string().uuid().required()
      // })
    }
  }, notificationsController.markAsRead)

  fastify.put('/mark-all-read', {
    preHandler: [authenticate],
    schema: {
      description: 'Mark all notifications as read',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }]
    }
  }, notificationsController.markAllAsRead)

  fastify.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Delete notification',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      // params: Joi.object({
      //   id: Joi.string().uuid().required()
      // })
    }
  }, notificationsController.deleteNotification)

  fastify.get('/preferences', {
    preHandler: [authenticate],
    schema: {
      description: 'Get notification preferences',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }]
    }
  }, notificationsController.getPreferences)

  fastify.put('/preferences', {
    preHandler: [authenticate],
    schema: {
      description: 'Update notification preferences',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      // body: Joi.object({
      //   emailNotifications: Joi.boolean(),
      //   jobAssigned: Joi.boolean(),
      //   jobDueSoon: Joi.boolean(),
      //   jobOverdue: Joi.boolean(),
      //   jobCompleted: Joi.boolean(),
      //   mentions: Joi.boolean()
      // })
    }
  }, notificationsController.updatePreferences)
}

module.exports = notificationsRoutes
