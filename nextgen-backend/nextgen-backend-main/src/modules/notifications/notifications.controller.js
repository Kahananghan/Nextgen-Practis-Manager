// ============================================
// src/modules/notifications/notifications.controller.js
// ============================================
const notificationsService = require('./notifications.service')
const logger = require('../../utils/logger')

class NotificationsController {
  async getNotifications(request, reply) {
    try {
      const notifications = await notificationsService.getNotifications(request.user.userId, request.query)
      return reply.send({ success: true, data: { notifications } })
    } catch (error) {
      logger.error({ event: 'GET_NOTIFICATIONS_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch notifications', statusCode: 500 } })
    }
  }

  async getUnreadCount(request, reply) {
    try {
      const count = await notificationsService.getUnreadCount(request.user.userId)
      return reply.send({ success: true, data: { count } })
    } catch (error) {
      logger.error({ event: 'GET_UNREAD_COUNT_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch unread count', statusCode: 500 } })
    }
  }

  async markAsRead(request, reply) {
    try {
      await notificationsService.markAsRead(request.params.id, request.user.userId)
      return reply.send({ success: true, message: 'Notification marked as read' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async markAllAsRead(request, reply) {
    try {
      await notificationsService.markAllAsRead(request.user.userId)
      return reply.send({ success: true, message: 'All notifications marked as read' })
    } catch (error) {
      logger.error({ event: 'MARK_ALL_AS_READ_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to mark all as read', statusCode: 500 } })
    }
  }

  async deleteNotification(request, reply) {
    try {
      await notificationsService.deleteNotification(request.params.id, request.user.userId)
      return reply.send({ success: true, message: 'Notification deleted' })
    } catch (error) {
      const statusCode = error.statusCode || 500
      return reply.code(statusCode).send({ success: false, error: { message: error.message, statusCode } })
    }
  }

  async getPreferences(request, reply) {
    try {
      const preferences = await notificationsService.getPreferences(request.user.userId)
      return reply.send({ success: true, data: preferences })
    } catch (error) {
      logger.error({ event: 'GET_PREFERENCES_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch preferences', statusCode: 500 } })
    }
  }

  async updatePreferences(request, reply) {
    try {
      const preferences = await notificationsService.updatePreferences(request.user.userId, request.body)
      return reply.send({ success: true, data: preferences, message: 'Preferences updated' })
    } catch (error) {
      logger.error({ event: 'UPDATE_PREFERENCES_CONTROLLER_ERROR', error: error.message })
      return reply.code(500).send({ success: false, error: { message: 'Failed to update preferences', statusCode: 500 } })
    }
  }
}

module.exports = new NotificationsController()
