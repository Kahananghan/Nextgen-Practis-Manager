// src/modules/alerts/alerts.routes.js
const alertsController = require('./alerts.controller');
const { authenticate } = require('../../middleware/auth');

async function alertsRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Get user alerts',
      tags: ['Alerts'],
      security: [{ bearerAuth: [] }],
    }
  }, alertsController.getAlerts);

  fastify.put('/:id/read', {
    preHandler: [authenticate],
    schema: {
      description: 'Mark alert as read',
      tags: ['Alerts'],
      security: [{ bearerAuth: [] }],
    }
  }, alertsController.markAsRead);

  fastify.put('/mark-all-read', {
    preHandler: [authenticate],
    schema: {
      description: 'Mark all alerts as read',
      tags: ['Alerts'],
      security: [{ bearerAuth: [] }],
    }
  }, alertsController.markAllAsRead);

  fastify.post('/generate-job-alerts', {
    preHandler: [authenticate],
    schema: {
      description: 'Trigger system job alerts generation for all tenants',
      tags: ['Alerts'],
      security: [{ bearerAuth: [] }],
    }
  }, alertsController.triggerJobAlerts);
}

module.exports = alertsRoutes;
