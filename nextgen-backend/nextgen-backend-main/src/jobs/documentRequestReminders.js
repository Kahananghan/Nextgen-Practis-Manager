// src/jobs/documentRequestReminders.js
const db = require('../config/database');
const logger = require('../utils/logger');
const documentRequestsService = require('../modules/documentRequests/documentRequests.service');

/**
 * Send automatic reminders for document requests based on reminder settings
 * Runs daily to check for upcoming due dates
 */
async function sendDocumentRequestReminders() {
  try {
    logger.info({ event: 'DOCUMENT_REQUEST_REMINDERS_JOB_STARTED' });

    // Get all pending document requests with reminders enabled
    const pendingRequests = await db.query(`
      SELECT 
        dr.*,
        c.name as client_name,
        c.email as client_email,
        dr.reminder_settings as reminder,
        dr.due_date,
        dr.last_reminder_sent,
        dr.reminder_count,
        dr.tenant_id
      FROM document_requests dr
      LEFT JOIN xpm_clients c ON dr.client_id = c.id AND dr.tenant_id = c.tenant_id
      WHERE dr.status = 'pending'
        AND dr.reminder_settings != 'none'
        AND dr.due_date IS NOT NULL
        AND c.email IS NOT NULL
    `);

    logger.info({
      event: 'DOCUMENT_REQUEST_REMINDERS_CHECK',
      totalPending: pendingRequests.rows.length
    });

    const now = new Date();
    const remindersSent = [];

    for (const request of pendingRequests.rows) {
      try {
        const dueDate = new Date(request.due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        const lastReminder = request.last_reminder_sent ? new Date(request.last_reminder_sent) : null;
        const hoursSinceLastReminder = lastReminder 
          ? Math.floor((now - lastReminder) / (1000 * 60 * 60))
          : null;

        let shouldSendReminder = false;
        let reminderType = '';

        // Check reminder logic based on setting
        switch (request.reminder) {
          case '1day':
            // Send 1 day before due date
            if (daysUntilDue === 1) {
              shouldSendReminder = true;
              reminderType = '1 day before due';
            }
            break;

          case '3days':
            // Send 3 days before due date
            if (daysUntilDue === 3) {
              shouldSendReminder = true;
              reminderType = '3 days before due';
            }
            break;

          case '7days':
            // Send 7 days before due date
            if (daysUntilDue === 7) {
              shouldSendReminder = true;
              reminderType = '7 days before due';
            }
            break;

          case 'daily':
            // Send daily until uploaded (max once per 24 hours)
            if (daysUntilDue <= 7 && daysUntilDue >= 0) {
              if (!hoursSinceLastReminder || hoursSinceLastReminder >= 24) {
                shouldSendReminder = true;
                reminderType = 'daily reminder';
              }
            }
            break;
        }

        // Don't send if reminder was already sent today for non-daily reminders
        if (shouldSendReminder && request.reminder !== 'daily' && hoursSinceLastReminder !== null && hoursSinceLastReminder < 24) {
          shouldSendReminder = false;
        }

        // Don't send if past due date (except for daily which sends until uploaded)
        if (daysUntilDue < 0 && request.reminder !== 'daily') {
          shouldSendReminder = false;
        }

        if (shouldSendReminder) {
          logger.info({
            event: 'SENDING_AUTO_REMINDER',
            documentRequestId: request.id,
            tenantId: request.tenant_id,
            clientEmail: request.client_email,
            daysUntilDue,
            reminderType,
            reminderSetting: request.reminder
          });

          await documentRequestsService.sendReminder(request.tenant_id, request.id);
          
          remindersSent.push({
            id: request.id,
            client: request.client_email,
            type: reminderType,
            daysUntilDue
          });
        }
      } catch (error) {
        logger.error({
          event: 'AUTO_REMINDER_SINGLE_FAILED',
          documentRequestId: request.id,
          tenantId: request.tenant_id,
          error: error.message
        });
        // Continue with next request
      }
    }

    logger.info({
      event: 'DOCUMENT_REQUEST_REMINDERS_JOB_COMPLETED',
      remindersSent: remindersSent.length,
      details: remindersSent
    });

  } catch (error) {
    logger.error({
      event: 'DOCUMENT_REQUEST_REMINDERS_JOB_ERROR',
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = {
  sendDocumentRequestReminders
};
