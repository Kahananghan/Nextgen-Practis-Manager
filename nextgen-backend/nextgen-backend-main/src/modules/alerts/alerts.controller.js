// src/modules/alerts/alerts.controller.js
const alertsService = require('./alerts.service');
const logger = require('../../utils/logger');

class AlertsController {
  async getAlerts(request, reply) {
    try {
      const userId = request.user.userId;
      const { unreadOnly, limit } = request.query;
      const alerts = await alertsService.getAlerts(userId, { unreadOnly, limit });
      return reply.send({ success: true, data: { alerts } });
    } catch (error) {
      logger.error({ event: 'GET_ALERTS_ERROR', error: error.message });
      return reply.code(500).send({ success: false, error: { message: 'Failed to fetch alerts', statusCode: 500 } });
    }
  }

  async markAsRead(request, reply) {
    try {
      const userId = request.user.userId;
      const alertId = request.params.id;
      await alertsService.markAsRead(alertId, userId);
      return reply.send({ success: true, message: 'Alert marked as read' });
    } catch (error) {
      logger.error({ event: 'MARK_ALERT_READ_ERROR', error: error.message });
      return reply.code(500).send({ success: false, error: { message: 'Failed to mark alert as read', statusCode: 500 } });
    }
  }

  async markAllAsRead(request, reply) {
    try {
      const userId = request.user.userId;
      await alertsService.markAllAsRead(userId);
      return reply.send({ success: true, message: 'All alerts marked as read' });
    } catch (error) {
      logger.error({ event: 'MARK_ALL_ALERTS_READ_ERROR', error: error.message });
      return reply.code(500).send({ success: false, error: { message: 'Failed to mark all alerts as read', statusCode: 500 } });
    }
  }

  // Trigger system job alerts generation for all tenants
  async triggerJobAlerts(request, reply) {
    try {
      await alertsService.generateJobAlertsForAllTenants();
      return reply.send({ success: true, message: 'Job alerts generated for all tenants.' });
    } catch (error) {
      logger.error({ event: 'TRIGGER_JOB_ALERTS_ERROR', error: error.message });
      return reply.code(500).send({ success: false, error: { message: 'Failed to generate job alerts', statusCode: 500 } });
    }
  }
}

module.exports = new AlertsController();
