// src/modules/alerts/alerts.service.js
const db = require('../../config/database');
const logger = require('../../utils/logger');

class AlertsService {
  /**
   * Get alerts for a user (optionally filter by unread, limit, etc)
   */
  async getAlerts(userId, { unreadOnly = false, limit = 50 } = {}) {
    let where = 'WHERE (user_id = $1 OR user_id IS NULL)';
    const params = [userId];
    if (unreadOnly) {
      where += ' AND is_read = false';
    }
    params.push(limit);
    const result = await db.query(
      `SELECT alerts.id, alerts.type, alerts.message, alerts.is_read, alerts.read_at, alerts.created_at, alerts.job_id, xpm_jobs.name as job_name, alerts.job_id, xpm_jobs.due_date
       FROM alerts
       LEFT JOIN xpm_jobs ON alerts.job_id = xpm_jobs.id
       ${where} ORDER BY alerts.created_at DESC LIMIT $2`,
      params
    );
    // Add formatted_due_date to each alert if due_date exists
    return result.rows.map(alert => {
      let formatted_due_date = null;
      if (alert.due_date) {
        try {
          formatted_due_date = new Date(alert.due_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        } catch (e) {
          formatted_due_date = alert.due_date;
        }
      }
      return { ...alert, formatted_due_date };
    });
  }

  async markAsRead(alertId, userId) {
    await db.query(
      'UPDATE alerts SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [alertId, userId]
    );
  }

  async markAllAsRead(userId) {
    await db.query(
      'UPDATE alerts SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }

  /**
   * Create a new alert
   * @param {object} alertData - { tenantId, userId, jobId, type, message }
   */
  async createAlert({ tenantId, userId, jobId, type, message }) {
    await db.query(
      `INSERT INTO alerts (tenant_id, user_id, job_id, type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, jobId, type, message]
    );
  }

  /**
   * Check if an alert already exists for a job/type today
   */
  async alertExists(tenantId, jobId, type) {
    const result = await db.query(
      `SELECT id, created_at FROM alerts 
       WHERE tenant_id = $1 AND job_id = $2 AND type = $3 
       AND created_at >= CURRENT_DATE 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId, jobId, type]
    );
    return result.rows.length > 0;
  }

  /**
   * Create a new alert with duplicate prevention
   */
  async createAlertSafe({ tenantId, userId, jobId, type, message }) {
    // Check for existing alert first
    const existingAlert = await db.query(
      `SELECT id FROM alerts 
       WHERE tenant_id = $1 AND job_id = $2 AND type = $3 
       AND created_at >= CURRENT_DATE`,
      [tenantId, jobId, type]
    );

    if (existingAlert.rows.length > 0) {
      return { success: false, message: 'Alert already exists for today' };
    }

    // Insert new alert
    await db.query(
      `INSERT INTO alerts (tenant_id, user_id, job_id, type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, jobId, type, message]
    );

    return { success: true, message: 'Alert created successfully' };
  }

  /**
   * Delete existing alerts before generating new ones
   */
  async deleteExistingAlerts(tenantId, userId, jobId, type) {
    try {
      await db.query(`
        DELETE FROM alerts 
        WHERE tenant_id = $1 
        AND ($2::text IS NULL OR user_id::text = $2) 
        AND ($3::text IS NULL OR job_id::text = $3) 
        AND ($4::text IS NULL OR type = $4)
      `, [tenantId, userId, jobId, type]);
      
      logger.info({
        event: 'EXISTING_ALERTS_DELETED',
        tenantId,
        userId,
        jobId,
        type
      });
    } catch (error) {
      logger.error({
        event: 'DELETE_EXISTING_ALERTS_ERROR',
        tenantId,
        userId,
        jobId,
        type,
        error: error.message
      });
    }
  }

  /**
   * Generate system alerts for jobs (overdue, due soon, completed) for a single tenant
   */
  async generateJobAlertsForTenant(tenantId) {
    // Overdue jobs
    const overdue = await db.query(`
      SELECT id, name, assigned_staff_id, due_date, state
      FROM xpm_jobs
      WHERE tenant_id = $1 AND state != 'Complete' AND due_date < CURRENT_DATE
    `, [tenantId]);

    // Due soon jobs (next 7 days)
    const dueSoon = await db.query(`
      SELECT id, name, assigned_staff_id, due_date, state
      FROM xpm_jobs
      WHERE tenant_id = $1 AND state != 'Complete' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'
    `, [tenantId]);

    // Recently completed jobs (completed in last 1 day)
    const completed = await db.query(`
      SELECT id, name, assigned_staff_id, due_date, state, updated_at
      FROM xpm_jobs
      WHERE tenant_id = $1 AND state = 'Complete' AND updated_at >= CURRENT_DATE - INTERVAL '1 day'
    `, [tenantId]);

    // Helper to check if user exists
    async function validUser(userId) {
      if (!userId) return false;
      const res = await db.query('SELECT 1 FROM users WHERE id = $1', [userId]);
      return res.rows.length > 0;
    }

    // Overdue alerts
    for (const job of overdue.rows) {
      let userId = null;
      if (await validUser(job.assigned_staff_id)) userId = job.assigned_staff_id;
      
      // Delete ALL existing alerts for this job first (overdue, due_soon, completed)
      await this.deleteExistingAlerts(tenantId, userId, job.id, null); // null = delete all types
      
      const result = await this.createAlertSafe({
        tenantId,
        userId,
        jobId: job.id,
        type: 'overdue',
        message: `Job is overdue`
      });
      
      if (result.success) {
        console.log(`Created overdue alert for job ${job.id}`);
      } else {
        console.log(`Overdue alert already exists for job ${job.id}`);
      }
    }

    // Due soon alerts
    for (const job of dueSoon.rows) {
      let userId = null;
      if (await validUser(job.assigned_staff_id)) userId = job.assigned_staff_id;
      
      // Delete ALL existing alerts for this job first (overdue, due_soon, completed)
      await this.deleteExistingAlerts(tenantId, userId, job.id, null); // null = delete all types
      
      const result = await this.createAlertSafe({
        tenantId,
        userId,
        jobId: job.id,
        type: 'due_soon',
        message: `Job is due soon`
      });
      
      if (result.success) {
        console.log(`Created due_soon alert for job ${job.id}`);
      } else {
        console.log(`Due_soon alert already exists for job ${job.id}`);
      }
    }

    // Completed alerts
    for (const job of completed.rows) {
      let userId = null;
      if (await validUser(job.assigned_staff_id)) userId = job.assigned_staff_id;
      
      // Delete existing completed alerts for this job first
      await this.deleteExistingAlerts(tenantId, userId, job.id, 'completed');
      
      const result = await this.createAlertSafe({
        tenantId,
        userId,
        jobId: job.id,
        type: 'completed',
        message: `Job was completed`
      });
      
      if (result.success) {
        console.log(`Created completed alert for job ${job.id}`);
      } else {
        console.log(`Completed alert already exists for job ${job.id}`);
      }
    }
  }

  /**
   * Generate job alerts for all tenants
   */
  async generateJobAlertsForAllTenants() {
    const tenants = await db.query('SELECT id FROM tenants');
    for (const row of tenants.rows) {
      await this.generateJobAlertsForTenant(row.id);
    }
  }
}

module.exports = new AlertsService();
