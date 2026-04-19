// ============================================
// src/modules/invoices/invoice.routes.js
// ============================================
const invoiceController = require('./invoice.controller')
const { authenticate } = require('../../middleware/auth')

async function invoiceRoutes(fastify, options) {
  
  // Generate and send invoice via email
  fastify.post('/invoices/send-email', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['to', 'subject', 'message', 'invoiceData'],
        properties: {
          to: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          message: { type: 'string' },
          invoiceData: {
            type: 'object',
            required: ['invoiceNumber', 'clientName', 'clientEmail', 'invoiceDate', 'dueDate', 'lineItems', 'subtotal', 'tax', 'total'],
            properties: {
              invoiceNumber: { type: 'string' },
              clientName: { type: 'string' },
              clientEmail: { type: 'string', format: 'email' },
              invoiceDate: { type: 'string', format: 'date' },
              dueDate: { type: 'string', format: 'date' },
              terms: { type: 'string' },
              lineItems: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['description', 'hours', 'rate', 'amount'],
                  properties: {
                    description: { type: 'string' },
                    hours: { type: 'number', minimum: 0 },
                    rate: { type: 'number', minimum: 0 },
                    amount: { type: 'number', minimum: 0 }
                  }
                }
              },
              subtotal: { type: 'number', minimum: 0 },
              tax: { type: 'number', minimum: 0 },
              total: { type: 'number', minimum: 0 },
              notes: { type: 'string' }
            }
          }
        }
      }
    }
  }, invoiceController.sendInvoice)

  // Push invoice to Xero
  fastify.post('/invoices/push-to-xero', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['invoiceData'],
        properties: {
          invoiceData: {
            type: 'object',
            required: ['invoiceNumber', 'clientName', 'clientEmail', 'invoiceDate', 'dueDate', 'lineItems', 'subtotal', 'tax', 'total'],
            properties: {
              invoiceNumber: { type: 'string' },
              clientName: { type: 'string' },
              clientEmail: { type: 'string', format: 'email' },
              invoiceDate: { type: 'string', format: 'date' },
              dueDate: { type: 'string', format: 'date' },
              terms: { type: 'string' },
              lineItems: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['description', 'hours', 'rate', 'amount'],
                  properties: {
                    description: { type: 'string' },
                    hours: { type: 'number', minimum: 0 },
                    rate: { type: 'number', minimum: 0 },
                    amount: { type: 'number', minimum: 0 }
                  }
                }
              },
              subtotal: { type: 'number', minimum: 0 },
              tax: { type: 'number', minimum: 0 },
              total: { type: 'number', minimum: 0 },
              notes: { type: 'string' }
            }
          }
        }
      }
    }
  }, invoiceController.pushToXero)

  // Generate invoice PDF
  fastify.post('/invoices/generate-pdf', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['invoiceNumber', 'clientName', 'clientEmail', 'invoiceDate', 'dueDate', 'lineItems', 'subtotal', 'tax', 'total'],
        properties: {
          invoiceNumber: { type: 'string' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string', format: 'email' },
          invoiceDate: { type: 'string', format: 'date' },
          dueDate: { type: 'string', format: 'date' },
          terms: { type: 'string' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'hours', 'rate', 'amount'],
              properties: {
                description: { type: 'string' },
                hours: { type: 'number', minimum: 0 },
                rate: { type: 'number', minimum: 0 },
                amount: { type: 'number', minimum: 0 }
              }
            }
          },
          subtotal: { type: 'number', minimum: 0 },
          tax: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 },
          notes: { type: 'string' }
        }
      }
    }
  }, invoiceController.generatePDF)

  // Save invoice draft
  fastify.post('/invoices/draft', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['invoiceNumber', 'clientName', 'clientEmail', 'invoiceDate', 'dueDate', 'lineItems', 'subtotal', 'tax', 'total'],
        properties: {
          invoiceNumber: { type: 'string' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string', format: 'email' },
          invoiceDate: { type: 'string', format: 'date' },
          dueDate: { type: 'string', format: 'date' },
          terms: { type: 'string' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'hours', 'rate', 'amount'],
              properties: {
                description: { type: 'string' },
                hours: { type: 'number', minimum: 0 },
                rate: { type: 'number', minimum: 0 },
                amount: { type: 'number', minimum: 0 }
              }
            }
          },
          subtotal: { type: 'number', minimum: 0 },
          tax: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 },
          notes: { type: 'string' }
        }
      }
    }
  }, invoiceController.saveDraft)

  // Get invoice history
  fastify.get('/invoices/history', {
    preHandler: [authenticate]
  }, invoiceController.getInvoiceHistory)
}

module.exports = invoiceRoutes
