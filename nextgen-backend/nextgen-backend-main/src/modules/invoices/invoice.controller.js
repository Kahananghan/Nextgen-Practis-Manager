// ============================================
// src/modules/invoices/invoice.controller.js
// ============================================
const invoiceService = require('./invoice.service')
const logger = require('../../utils/logger')

class InvoiceController {
  // Send invoice via email
  async sendInvoice(request, reply) {
    try {
      const { to, subject, message, invoiceData } = request.body
      const userId = request.user.userId

      logger.info('Sending invoice via email', { 
        userId, 
        invoiceNumber: invoiceData.invoiceNumber,
        to 
      })

      const result = await invoiceService.sendInvoice({
        to,
        subject,
        message,
        invoiceData,
        userId
      })

      return reply.code(200).send({
        success: true,
        message: 'Invoice sent successfully via email',
        invoiceId: result.invoiceId
      })
    } catch (error) {
      logger.error('Failed to send invoice via email', { 
        error: error.message,
        userId: request.user?.id 
      })
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to send invoice via email'
      })
    }
  }

  // Push invoice to Xero
  async pushToXero(request, reply) {
    try {
      const { invoiceData } = request.body
      const userId = request.user.userId

      logger.info('Pushing invoice to Xero', { 
        userId, 
        invoiceNumber: invoiceData.invoiceNumber 
      })

      const result = await invoiceService.pushToXero({
        invoiceData,
        userId
      })

      return reply.code(200).send({
        success: true,
        message: 'Invoice successfully pushed to Xero',
        xeroInvoiceId: result.xeroInvoiceId,
        invoiceId: result.invoiceId
      })
    } catch (error) {
      logger.error('Failed to push invoice to Xero', { 
        error: error.message,
        userId: request.user?.id 
      })
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to push invoice to Xero'
      })
    }
  }

  // Generate invoice PDF
  async generatePDF(request, reply) {
    try {
      const invoiceData = request.body
      const userId = request.user.userId

      logger.info('Generating invoice PDF', { 
        userId, 
        invoiceNumber: invoiceData.invoiceNumber 
      })

      const pdfBuffer = await invoiceService.generatePDF({
        invoiceData,
        userId
      })

      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`)
      
      return reply.code(200).send(pdfBuffer)
    } catch (error) {
      logger.error('Failed to generate invoice PDF', { 
        error: error.message,
        userId: request.user?.id 
      })
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to generate invoice PDF'
      })
    }
  }

  // Save invoice draft
  async saveDraft(request, reply) {
    try {
      const invoiceData = request.body
      const userId = request.user.userId

      logger.info('Saving invoice draft', { 
        userId, 
        invoiceNumber: invoiceData.invoiceNumber 
      })

      const result = await invoiceService.saveDraft({
        invoiceData,
        userId
      })

      return reply.code(201).send({
        success: true,
        message: 'Invoice draft saved successfully',
        invoiceId: result.invoiceId
      })
    } catch (error) {
      logger.error('Failed to save invoice draft', { 
        error: error.message,
        userId: request.user?.id 
      })
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to save invoice draft'
      })
    }
  }

  // Get invoice history
  async getInvoiceHistory(request, reply) {
    try {
      const userId = request.user.userId
      const { page = 1, limit = 20, status } = request.query

      logger.info('Fetching invoice history', { userId, page, limit, status })

      const result = await invoiceService.getInvoiceHistory({
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        status
      })

      return reply.code(200).send({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Failed to get invoice history', { 
        error: error.message,
        userId: request.user?.id 
      })
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get invoice history'
      })
    }
  }
}

module.exports = new InvoiceController()
