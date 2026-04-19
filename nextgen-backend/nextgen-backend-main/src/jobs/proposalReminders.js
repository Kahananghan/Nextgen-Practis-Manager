// src/jobs/proposalReminders.js
const db = require('../config/database');
const logger = require('../utils/logger');
const ProposalsService = require('../modules/proposals/proposals.service');

/**
 * Send automatic reminders for proposals based on reminder settings
 * Runs daily to check for upcoming expiry dates
 */
async function sendProposalReminders() {
  try {
    logger.info({ event: 'PROPOSAL_REMINDERS_JOB_STARTED' });

    // Get all active proposals with reminders enabled
    // Include both: 1) unopened proposals, and 2) pending signature (terms agreed but not signed)
    const activeProposals = await db.query(`
      SELECT
        p.*,
        c.name as client_name,
        c.email as client_email,
        p.expiry_date,
        p.auto_reminder_days,
        p.last_reminder_sent,
        p.terms_agreed_at,
        p.tenant_id
      FROM proposals p
      LEFT JOIN xpm_clients c ON p.client_id = c.id AND p.tenant_id = c.tenant_id
      WHERE p.status IN ('sent', 'viewed')
        AND p.auto_reminder_days IS NOT NULL
        AND p.auto_reminder_days > 0
        AND p.expiry_date IS NOT NULL
        AND c.email IS NOT NULL
        AND (
          (p.open_count IS NULL OR p.open_count = 0)
          OR (p.terms_agreed_at IS NOT NULL)
        )
    `);

    logger.info({
      event: 'PROPOSAL_REMINDERS_CHECK',
      totalActive: activeProposals.rows.length
    });

    const now = new Date();
    const remindersSent = [];

    for (const proposal of activeProposals.rows) {
      try {
        const expiryDate = new Date(proposal.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const lastReminder = proposal.last_reminder_sent ? new Date(proposal.last_reminder_sent) : null;
        const hoursSinceLastReminder = lastReminder
          ? Math.floor((now - lastReminder) / (1000 * 60 * 60))
          : null;

        let shouldSendReminder = false;
        let reminderType = '';

        // Check if proposal is in pending signature state (terms agreed but not signed)
        const isPendingSignature = proposal.terms_agreed_at !== null;

        if (isPendingSignature) {
          // For pending signature state, send reminders more frequently (every 2 days)
          // This is because the client has started the process but hasn't completed it
          if (!hoursSinceLastReminder || hoursSinceLastReminder >= 48) {
            shouldSendReminder = true;
            reminderType = 'pending signature reminder';
          }
        } else {
          // For normal state, send reminder when days until expiry matches auto_reminder_days
          if (daysUntilExpiry === proposal.auto_reminder_days) {
            // Don't send if reminder was already sent in the last 24 hours
            if (!hoursSinceLastReminder || hoursSinceLastReminder >= 24) {
              shouldSendReminder = true;
              reminderType = `${proposal.auto_reminder_days} days before expiry`;
            }
          }
        }

        // Don't send if past expiry date
        if (daysUntilExpiry < 0) {
          shouldSendReminder = false;
        }

        if (shouldSendReminder) {
          logger.info({
            event: 'SENDING_PROPOSAL_AUTO_REMINDER',
            proposalId: proposal.id,
            tenantId: proposal.tenant_id,
            clientEmail: proposal.client_email,
            daysUntilExpiry,
            reminderType,
            autoReminderDays: proposal.auto_reminder_days,
            isPendingSignature
          });

          await ProposalsService.sendReminder(proposal.tenant_id, proposal.id);

          // Update last_reminder_sent timestamp
          await db.query(`
            UPDATE proposals
            SET last_reminder_sent = NOW()
            WHERE id = $1
          `, [proposal.id]);

          remindersSent.push({
            id: proposal.id,
            client: proposal.client_email,
            type: reminderType,
            daysUntilExpiry,
            isPendingSignature
          });
        }
      } catch (error) {
        logger.error({
          event: 'PROPOSAL_AUTO_REMINDER_SINGLE_FAILED',
          proposalId: proposal.id,
          tenantId: proposal.tenant_id,
          error: error.message
        });
        // Continue with next proposal
      }
    }

    logger.info({
      event: 'PROPOSAL_REMINDERS_JOB_COMPLETED',
      remindersSent: remindersSent.length,
      details: remindersSent
    });

  } catch (error) {
    logger.error({
      event: 'PROPOSAL_REMINDERS_JOB_ERROR',
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = {
  sendProposalReminders
};
