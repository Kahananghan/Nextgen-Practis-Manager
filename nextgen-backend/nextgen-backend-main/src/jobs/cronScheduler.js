// src/jobs/cronScheduler.js
const cron = require('node-cron');
const { eraseFilesFromChat } = require('./eraseFilesFromChat');
const { sendDocumentRequestReminders } = require('./documentRequestReminders');
const { sendProposalReminders } = require('./proposalReminders');
const alertsService = require('../modules/alerts/alerts.service');
const recurrenceService = require('../modules/recurrence/recurrence.service');
const logger = require('../utils/logger');

/**
 * Initialize and start all cron jobs
 */
function initCronJobs() {
  // Schedule chat files cleanup job - runs every day at midnight (00:00)
  const eraseFilesJob = cron.schedule('0 0 * * *', async () => {
    logger.info({ event: 'CHAT_FILES_ERASE_JOB_STARTED' });
    await eraseFilesFromChat();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // Server timezone or use process.env.TZ
  });

  // Schedule document request reminders - runs every day at 9:00 AM
  const documentRemindersJob = cron.schedule('0 9 * * *', async () => {
    logger.info({ event: 'DOCUMENT_REQUEST_REMINDERS_CRON_STARTED' });
    await sendDocumentRequestReminders();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Schedule job alerts generation - runs every day at 10:00 AM
  const jobAlertsJob = cron.schedule('0 10 * * *', async () => {
    logger.info({ event: 'JOB_ALERTS_CRON_STARTED' });
    await alertsService.generateJobAlertsForAllTenants();
    logger.info({ event: 'JOB_ALERTS_CRON_COMPLETED' });
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Schedule recurrence processing - runs every day at 9:00 AM
  const recurrenceJob = cron.schedule('0 9 * * *', async () => {
    logger.info({ event: 'RECURRENCE_PROCESSING_STARTED' });
    await recurrenceService.processDueRecurrences();
    logger.info({ event: 'RECURRENCE_PROCESSING_COMPLETED' });
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Schedule proposal reminders - runs every day at 9:00 AM
  const proposalRemindersJob = cron.schedule('0 9 * * *', async () => {
    logger.info({ event: 'PROPOSAL_REMINDERS_CRON_STARTED' });
    await sendProposalReminders();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Handle graceful shutdown
  eraseFilesJob.start();
  documentRemindersJob.start();
  jobAlertsJob.start();
  recurrenceJob.start();
  proposalRemindersJob.start();

  logger.info({ event: 'CRON_JOBS_INITIALIZED' });

  // Return jobs for potential cleanup
  return {
    eraseFilesJob,
    documentRemindersJob,
    jobAlertsJob,
    recurrenceJob,
    proposalRemindersJob,
  };
}

/**
 * Stop all cron jobs
 * @param {Object} jobs - Cron job instances
 */
function stopCronJobs(jobs) {
  if (jobs?.eraseFilesJob) {
    jobs.eraseFilesJob.stop();
  }
  if (jobs?.documentRemindersJob) {
    jobs.documentRemindersJob.stop();
  }
  if (jobs?.jobAlertsJob) {
    jobs.jobAlertsJob.stop();
  }
  if (jobs?.recurrenceJob) {
    jobs.recurrenceJob.stop();
  }
  if (jobs?.proposalRemindersJob) {
    jobs.proposalRemindersJob.stop();
  }
  logger.info({ event: 'CRON_JOBS_STOPPED' });
}

module.exports = {
  initCronJobs,
  stopCronJobs,
};
