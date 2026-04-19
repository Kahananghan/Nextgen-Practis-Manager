// ============================================
// src/modules/invoices/invoice.service.js
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')
const emailService = require('../../utils/emailService')
const xeroService = require('../integrations/xero/xero.service')
const puppeteer = require('puppeteer')


class InvoiceService {
  
  // Send invoice via email
  async sendInvoice({ to, subject, message, invoiceData, userId }) {
    try {
      // Generate PDF 
      const pdfBuffer = await this.generateInvoicePDF(invoiceData)

      // Always use the full HTML template with all invoice details
      const emailBody = this.getDefaultEmailTemplate(invoiceData)
      const result = await emailService.sendMail(to, subject, emailBody)
      
      // If EmailService returns an error message, throw it
      if (typeof result === 'string') {
        throw new Error(result)
      }

      // Only save to database if email was sent successfully
      const invoiceId = await this.saveInvoiceToDatabase({
        ...invoiceData,
        userId,
        status: 'sent',
        sentVia: 'email'
      })

      logger.info('Invoice sent successfully via email', { 
        invoiceId, 
        invoiceNumber: invoiceData.invoiceNumber,
        to 
      })

      return { invoiceId }
    } catch (error) {
      logger.error('Error sending invoice via email', { error: error.message })
      throw new Error('Failed to send invoice via email')
    }
  }

  // Push invoice to Xero
  async pushToXero({ invoiceData, userId }) {
    try {
      // Create invoice in Xero first, then save to database if successful
      const xeroResult = await xeroService.createInvoice(userId, invoiceData)

      // Only save to database if Xero push was successful
      if (xeroResult.success) {
        const invoiceId = await this.saveInvoiceToDatabase({
          ...invoiceData,
          userId,
          status: 'synced',
          sentVia: 'xero'
        })
        
        await db.query(`
          UPDATE invoices 
          SET xero_invoice_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [xeroResult.xeroInvoiceId, invoiceId])

        logger.info('Invoice pushed to Xero successfully', { 
          invoiceId, 
          invoiceNumber: invoiceData.invoiceNumber,
          xeroInvoiceId: xeroResult.xeroInvoiceId
        })

        return { 
          invoiceId, 
          xeroInvoiceId: xeroResult.xeroInvoiceId 
        }
      } else {
        throw new Error(xeroResult.message || 'Failed to push invoice to Xero')
      }
    } catch (error) {
      logger.error('Error pushing invoice to Xero', { error: error.message })
      throw new Error('Failed to push invoice to Xero')
    }
  }

  // Generate invoice PDF
  async generatePDF({ invoiceData, userId }) {
    try {
      const pdfBuffer = await this.generateInvoicePDF(invoiceData)
      
      // Save invoice to database as draft
      const invoiceId = await this.saveInvoiceToDatabase({
        ...invoiceData,
        userId,
        status: 'draft',
        sentVia: 'pdf'
      })

      logger.info('Invoice PDF generated successfully', { 
        invoiceId, 
        invoiceNumber: invoiceData.invoiceNumber 
      })

      return pdfBuffer
    } catch (error) {
      logger.error('Error generating invoice PDF', { error: error.message })
      throw new Error('Failed to generate invoice PDF')
    }
  }

  // Save invoice draft
  async saveDraft({ invoiceData, userId }) {
    try {
      const invoiceId = await this.saveInvoiceToDatabase({
        ...invoiceData,
        userId,
        status: 'draft',
        sentVia: 'manual'
      })

      logger.info('Invoice draft saved successfully', { 
        invoiceId, 
        invoiceNumber: invoiceData.invoiceNumber 
      })

      return { invoiceId }
    } catch (error) {
      logger.error('Error saving invoice draft', { error: error.message })
      throw new Error('Failed to save invoice draft')
    }
  }

  // Get invoice history
  async getInvoiceHistory({ userId, page, limit, status }) {
    try {
      let whereClause = 'WHERE user_id = $1'
      const params = [userId]

      if (status) {
        whereClause += ' AND status = $2'
        params.push(status)
      }

      const offset = (page - 1) * limit

      // Get invoices
      const invoicesResult = await db.query(`
        SELECT 
          id,
          invoice_number,
          client_name,
          client_email,
          invoice_date,
          due_date,
          subtotal,
          tax,
          total,
          status,
          sent_via,
          xero_invoice_id,
          created_at,
          updated_at
        FROM invoices 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset])

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM invoices 
        ${whereClause}
      `, params)

      const total = parseInt(countResult.rows[0].total)
      const totalPages = Math.ceil(total / limit)

      return {
        invoices: invoicesResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Error getting invoice history', { error: error.message })
      throw new Error('Failed to get invoice history')
    }
  }

  // Save invoice to database
  async saveInvoiceToDatabase(invoiceData) {
    try {
      const result = await db.query(`
        INSERT INTO invoices (
          user_id,
          invoice_number,
          client_name,
          client_email,
          invoice_date,
          due_date,
          terms,
          line_items,
          subtotal,
          tax,
          total,
          notes,
          status,
          sent_via,
          xero_invoice_id,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        ) RETURNING id
      `, [
        invoiceData.userId,
        invoiceData.invoiceNumber,
        invoiceData.clientName,
        invoiceData.clientEmail,
        invoiceData.invoiceDate,
        invoiceData.dueDate,
        invoiceData.terms || '',
        JSON.stringify(invoiceData.lineItems),
        invoiceData.subtotal,
        invoiceData.tax,
        invoiceData.total,
        invoiceData.notes || '',
        invoiceData.status || 'draft',
        invoiceData.sentVia || 'manual',
        invoiceData.xeroInvoiceId || null
      ])

      return result.rows[0].id
    } catch (error) {
      logger.error('Error saving invoice to database', { error: error.message })
      throw new Error('Failed to save invoice to database')
    }
  }

  // Generate invoice PDF using Puppeteer
  async generateInvoicePDF(invoiceData) {
    try {
      const html = this.getInvoiceHTMLTemplate(invoiceData)
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })
      
      await browser.close()
      
      return pdfBuffer
    } catch (error) {
      logger.error('Error generating PDF with Puppeteer', { error: error.message })
      throw new Error('Failed to generate PDF')
    }
  }

  // Get default email template
  getDefaultEmailTemplate(invoiceData) {
    const lineItemsHTML = invoiceData.lineItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left; font-size: 14px;">${item.description}</td>
        <td style="padding: 12px; text-align: right; font-size: 14px;">${item.hours}</td>
        <td style="padding: 12px; text-align: right; font-size: 14px;">$${item.rate.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: bold;">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('')

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: bold;">INVOICE</h1>
            <h2 style="color: #333; margin: 10px 0 0 0; font-size: 20px;">${invoiceData.invoiceNumber}</h2>
          </div>
          
          <!-- Client Info -->
          <div style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <p style="margin: 0; font-size: 16px; color: #333;"><strong>Bill To:</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 18px; color: #6366f1; font-weight: bold;">${invoiceData.clientName}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${invoiceData.clientEmail}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 14px; color: #666;"><strong>Date:</strong> ${invoiceData.invoiceDate}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>Due:</strong> ${invoiceData.dueDate}</p>
              </div>
            </div>
          </div>
          
          <!-- Line Items -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Services Rendered</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #6366f1;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #6366f1; font-weight: bold;">Description</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #6366f1; font-weight: bold;">Hours</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #6366f1; font-weight: bold;">Rate</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #6366f1; font-weight: bold;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHTML}
              </tbody>
            </table>
          </div>
          
          <!-- Totals -->
          <div style="text-align: right; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 16px; color: #333;"><strong>Subtotal:</strong> $${invoiceData.subtotal.toFixed(2)}</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333;"><strong>Tax:</strong> $${invoiceData.tax.toFixed(2)}</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #6366f1; font-weight: bold;">Total Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
          </div>
          
          ${invoiceData.notes ? `
          <!-- Notes -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Notes</h3>
            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">${invoiceData.notes}</p>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 30px; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="margin: 0; font-size: 12px; color: #999;">Payment due within 30 days. Please reference invoice number when making payment.</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Thank you for your business!</p>
          </div>
          
        </div>
      </div>
    `
  }

  // Get invoice HTML template
  getInvoiceHTMLTemplate(invoiceData) {
    const lineItemsHTML = invoiceData.lineItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${item.hours}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">$${item.rate.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 30px; }
          .line-items { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
          .totals { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoiceData.invoiceNumber}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Client:</strong> ${invoiceData.clientName}</p>
          <p><strong>Email:</strong> ${invoiceData.clientEmail}</p>
          <p><strong>Invoice Date:</strong> ${invoiceData.invoiceDate}</p>
          <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>
          ${invoiceData.terms ? `<p><strong>Terms:</strong> ${invoiceData.terms}</p>` : ''}
        </div>
        
        <div class="line-items">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Hours</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHTML}
            </tbody>
          </table>
        </div>
        
        <div class="totals">
          <p><strong>Subtotal:</strong> $${invoiceData.subtotal.toFixed(2)}</p>
          <p><strong>Tax:</strong> $${invoiceData.tax.toFixed(2)}</p>
          <p><strong>Total:</strong> $${invoiceData.total.toFixed(2)}</p>
        </div>
        
        ${invoiceData.notes ? `
          <div style="margin-top: 30px;">
            <h3>Notes:</h3>
            <p>${invoiceData.notes}</p>
          </div>
        ` : ''}
      </body>
      </html>
    `
  }
}

module.exports = new InvoiceService()
