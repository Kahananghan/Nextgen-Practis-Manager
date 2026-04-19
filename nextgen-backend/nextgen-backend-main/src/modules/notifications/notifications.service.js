// ============================================
// src/modules/notifications/notifications.service.js
// Notifications Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const { NotFoundError } = require('../../utils/errors')
// Note: Email sending requires nodemailer package
// npm install nodemailer

class NotificationsService {
  /**
   * Get notifications for user
   * @param {string} userId - User ID
   * @param {object} filters - Filters
   * @returns {Array} - Notifications
   */
  async getNotifications(userId, filters = {}) {
    try {
      const { unreadOnly = false, limit = 50 } = filters
      let whereClause = 'WHERE user_id = $1'
      const params = [userId]

      if (unreadOnly) {
        whereClause += ' AND is_read = false'
      }

      const result = await db.query(`
        SELECT 
          id,
          type,
          title,
          message,
          data,
          is_read,
          created_at
        FROM notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit])

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: row.data,
        isRead: row.is_read,
        createdAt: row.created_at
      }))
    } catch (error) {
      logger.error({
        event: 'GET_NOTIFICATIONS_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @returns {number} - Unread count
   */
  async getUnreadCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      )
      return parseInt(result.rows[0].count)
    } catch (error) {
      logger.error({
        event: 'GET_UNREAD_COUNT_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create notification
   * @param {string} userId - User ID
   * @param {object} notificationData - Notification data
   * @returns {object} - Created notification
   */
  async createNotification(userId, notificationData) {
    try {
      const { type, title, message, data = {} } = notificationData

      const result = await db.query(`
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_read
        )
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING *
      `, [userId, type, title, message, JSON.stringify(data)])

      logger.info({
        event: 'NOTIFICATION_CREATED',
        userId,
        type
      })

      return result.rows[0]
    } catch (error) {
      logger.error({
        event: 'CREATE_NOTIFICATION_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await db.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('Notification not found')
      }

      return result.rows[0]
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'MARK_AS_READ_ERROR',
        notificationId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   */
  async markAllAsRead(userId) {
    try {
      await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      )
      return { success: true }
    } catch (error) {
      logger.error({
        event: 'MARK_ALL_AS_READ_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      )

      if (result.rowCount === 0) {
        throw new NotFoundError('Notification not found')
      }

      return { success: true }
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error({
        event: 'DELETE_NOTIFICATION_ERROR',
        notificationId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get notification preferences for user
   * @param {string} userId - User ID
   * @returns {object} - Preferences
   */
  async getPreferences(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        // Return defaults
        return {
          emailNotifications: true,
          jobAssigned: true,
          jobDueSoon: true,
          jobOverdue: true,
          jobCompleted: true,
          mentions: true
        }
      }

      return result.rows[0].preferences
    } catch (error) {
      logger.error({
        event: 'GET_PREFERENCES_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {object} preferences - Preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      await db.query(`
        INSERT INTO notification_preferences (user_id, preferences)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET preferences = $2, updated_at = NOW()
      `, [userId, JSON.stringify(preferences)])

      return preferences
    } catch (error) {
      logger.error({
        event: 'UPDATE_PREFERENCES_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Send email notification
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   */
  async sendEmail(to, subject, html) {
    try {
      // TODO: Implement actual email sending with nodemailer
      // const nodemailer = require('nodemailer')
      // const transporter = nodemailer.createTransport({ ... })
      // await transporter.sendMail({ from, to, subject, html })

      logger.info({
        event: 'EMAIL_SENT',
        to,
        subject
      })

      // For now, just log
      console.log(`[EMAIL] To: ${to}, Subject: ${subject}`)
      
      return { success: true }
    } catch (error) {
      logger.error({
        event: 'SEND_EMAIL_ERROR',
        to,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Notify job assigned
   * @param {string} userId - User ID
   * @param {object} jobData - Job data
   */
  async notifyJobAssigned(userId, jobData) {
    try {
      await this.createNotification(userId, {
        type: 'job_assigned',
        title: 'New Job Assigned',
        message: `You have been assigned to: ${jobData.name}`,
        data: { jobId: jobData.id }
      })

      // Send email if enabled
      const prefs = await this.getPreferences(userId)
      if (prefs.emailNotifications && prefs.jobAssigned) {
        const user = await db.query('SELECT email FROM users WHERE id = $1', [userId])
        if (user.rows.length > 0) {
          await this.sendEmail(
            user.rows[0].email,
            'New Job Assignment',
            `<h2>You have been assigned to a new job</h2><p><strong>${jobData.name}</strong></p><p>Due: ${jobData.dueDate || 'Not set'}</p>`
          )
        }
      }
    } catch (error) {
      logger.error({
        event: 'NOTIFY_JOB_ASSIGNED_ERROR',
        userId,
        error: error.message
      })
    }
  }

  /**
   * Notify job due soon
   * @param {string} userId - User ID
   * @param {object} jobData - Job data
   */
  async notifyJobDueSoon(userId, jobData) {
    try {
      await this.createNotification(userId, {
        type: 'job_due_soon',
        title: 'Job Due Soon',
        message: `${jobData.name} is due in 3 days`,
        data: { jobId: jobData.id }
      })
    } catch (error) {
      logger.error({
        event: 'NOTIFY_JOB_DUE_SOON_ERROR',
        error: error.message
      })
    }
  }
}

module.exports = new NotificationsService()
