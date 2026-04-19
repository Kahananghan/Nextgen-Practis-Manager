// ============================================
// src/modules/integrations/xero/xero.service.js
// XPM OAuth & Token Management Service
// ============================================
const { XeroClient } = require('xero-node')
const db = require('../../../config/database')
const redis = require('../../../config/redis')
const config = require('../../../config')
const crypto = require('../../../utils/crypto')
const logger = require('../../../utils/logger')
const { 
  NotFoundError, 
  AuthenticationError 
} = require('../../../utils/errors')

class XeroService {
  constructor() {
    this.client = new XeroClient(config.xero)
  }

  /**
   * Build OAuth consent URL
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {string} - Authorization URL
   */
  async buildConsentUrl(userId, tenantId) {
    try {
      // Store state in session/Redis for CSRF protection
      const state = crypto.encrypt(JSON.stringify({ userId, tenantId, timestamp: Date.now() }))
      
      const consentUrl = await this.client.buildConsentUrl()

      // Store state in Redis (5 minute expiry)
      await redis.set(`oauth:state:${userId}`, state, 300)

      logger.info({
        event: 'OAUTH_CONSENT_URL_GENERATED',
        userId,
        tenantId
      })

      return {
        consentUrl,
        state
      }
    } catch (error) {
      logger.error({
        event: 'BUILD_CONSENT_URL_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} url - Callback URL with code
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Token set and tenant info
   */
  async handleCallback(url, userId, tenantId) {
    try {
      logger.info({
        event: 'OAUTH_CALLBACK_START',
        userId,
        tenantId,
        callbackUrl: url
      })

      // Exchange code for tokens
      const tokenSet = await this.client.apiCallback(url)

      logger.info({
        event: 'OAUTH_TOKEN_EXCHANGE_SUCCESS',
        userId,
        tenantId,
        hasAccessToken: !!tokenSet.access_token,
        hasRefreshToken: !!tokenSet.refresh_token,
        hasIdToken: !!tokenSet.id_token,
        expiresAt: new Date(tokenSet.expires_at * 1000).toISOString()
      })

      // Get tenant connections
      await this.client.updateTenants()
      const tenants = this.client.tenants

      logger.info({
        event: 'OAUTH_TENANTS_RETRIEVED',
        userId,
        tenantId,
        tenantCount: tenants ? tenants.length : 0,
        tenants: tenants?.map(t => ({
          id: t.tenantId,
          name: t.tenantName,
          type: t.tenantType
        }))
      })

      if (!tenants || tenants.length === 0) {
        throw new AuthenticationError('No Xero organizations connected')
      }

      // Use first tenant (Practice Manager tenant)
      const xpmTenant = tenants[0]

      logger.info({
        event: 'OAUTH_TENANT_SELECTED',
        userId,
        tenantId,
        xpmTenantId: xpmTenant.tenantId,
        xpmTenantName: xpmTenant.tenantName,
        xpmTenantType: xpmTenant.tenantType
      })

      // Encrypt tokens
      const encryptedTokens = crypto.encryptTokenSet(tokenSet)

      logger.info({
        event: 'OAUTH_TOKENS_ENCRYPTED',
        userId,
        tenantId
      })

      // Save to database
      await this.saveTokens(userId, tenantId, encryptedTokens, xpmTenant, tokenSet.expires_at)

      logger.info({
        event: 'OAUTH_TOKENS_SAVED',
        userId,
        tenantId
      })

      // Update integration status
      await this.updateIntegrationStatus(tenantId, 'connected', null)

      logger.info({
        event: 'OAUTH_INTEGRATION_STATUS_UPDATED',
        userId,
        tenantId,
        status: 'connected'
      })

      logger.info({
        event: 'XERO_OAUTH_SUCCESS',
        userId,
        tenantId,
        xpmTenantId: xpmTenant.tenantId,
        xpmTenantName: xpmTenant.tenantName,
        xpmTenantType: xpmTenant.tenantType
      })

      return {
        success: true,
        tenant: {
          id: xpmTenant.tenantId,
          name: xpmTenant.tenantName,
          type: xpmTenant.tenantType
        }
      }
    } catch (error) {
      logger.error({
        event: 'OAUTH_CALLBACK_ERROR',
        userId,
        tenantId,
        error: error.message,
        stack: error.stack
      })
      
      // Update integration status to error
      await this.updateIntegrationStatus(tenantId, 'error', error.message)
      
      throw error
    }
  }

  /**
   * Save encrypted tokens to database
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {object} encryptedTokens - Encrypted token set
   * @param {object} xpmTenant - XPM tenant info
   * @param {number} expiresAt - Token expiry timestamp
   */
  async saveTokens(userId, tenantId, encryptedTokens, xpmTenant, expiresAt) {
    try {
      const expiryDate = new Date(expiresAt * 1000)

      await db.query(`
        INSERT INTO xero_tokens (
          user_id,
          tenant_id,
          access_token,
          refresh_token,
          id_token,
          expires_at,
          xpm_tenant_id,
          xpm_tenant_name,
          xpm_tenant_type,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          access_token = $3,
          refresh_token = $4,
          id_token = $5,
          expires_at = $6,
          xpm_tenant_id = $7,
          xpm_tenant_name = $8,
          xpm_tenant_type = $9,
          updated_at = NOW()
      `, [
        userId,
        tenantId,
        encryptedTokens.access_token,
        encryptedTokens.refresh_token,
        encryptedTokens.id_token,
        expiryDate,
        xpmTenant.tenantId,
        xpmTenant.tenantName,
        xpmTenant.tenantType
      ])

      logger.info({
        event: 'SAVE_TOKENS_SUCCESS',
        userId,
        tenantId,
        tokensSaved: true
      })

      // Clear token cache
      await redis.delete(`xero:tokens:${userId}`)
    } catch (error) {
      logger.error({
        event: 'SAVE_TOKENS_ERROR',
        userId,
        tenantId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Get client for user (with auto token refresh)
   * @param {string} userId - User ID
   * @returns {XeroClient} - Authenticated Xero client
   */
  async getClientForUser(userId) {
    try {
      logger.info({
        event: 'GET_CLIENT_START',
        userId
      })

      // Check cache first
      const cacheKey = `xero:tokens:${userId}`
      let tokenData = await redis.get(cacheKey)



      
      if (!tokenData) {
        // Get from database by user_id first
        let result = await db.query(`
          SELECT 
            access_token,
            refresh_token,
            id_token,
            expires_at,
            xpm_tenant_id,
            tenant_id
          FROM xero_tokens
          WHERE user_id = $1
        `, [userId])

        // If no tokens for this user, try by tenant_id (for shared connections)
        if (result.rows.length === 0) {          
          // Get any token for this tenant (shared Xero connection)
          result = await db.query(`
            SELECT 
              access_token,
              refresh_token,
              id_token,
              expires_at,
              xpm_tenant_id,
              tenant_id
            FROM xero_tokens
            WHERE tenant_id = (
              SELECT tenant_id FROM users WHERE id = $1
            )
            LIMIT 1
          `, [userId])
        }

        if (result.rows.length === 0) {
          throw new NotFoundError('No Xero connection found. Please connect to Xero first.')
        }

        tokenData = result.rows[0]
        
        // Cache for 5 minutes
        await redis.set(cacheKey, tokenData, 300)
      }

      logger.info({
        event: 'TOKEN_DATA_RETRIEVED',
        userId,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresAt: tokenData.expires_at
      })

      // Decrypt tokens
      const decryptedTokens = crypto.decryptTokenSet({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        id_token: tokenData.id_token
      })

      logger.info({
        event: 'TOKENS_DECRYPTED',
        userId,
        hasDecryptedAccessToken: !!decryptedTokens.access_token,
        hasDecryptedRefreshToken: !!decryptedTokens.refresh_token
      })

      // Create token set for XeroClient
      const tokenSet = {
        access_token: decryptedTokens.access_token,
        refresh_token: decryptedTokens.refresh_token,
        id_token: decryptedTokens.id_token,
        expires_at: Math.floor(new Date(tokenData.expires_at).getTime() / 1000)
      }

      logger.info({
        event: 'TOKEN_SET_CREATED',
        userId,
        expiresAt: tokenSet.expires_at
      })

      // Set tokens in client
      this.client.setTokenSet(tokenSet)

      logger.info({
        event: 'TOKENS_SET_IN_CLIENT',
        userId
      })

      // Check if token needs refresh (5 minute buffer)
      const now = Math.floor(Date.now() / 1000)
      const expiresIn = tokenSet.expires_at - now

      if (expiresIn < 300) {
        logger.info({
          event: 'TOKEN_REFRESH_NEEDED',
          userId,
          expiresIn
        })

        try {
          // Refresh token
          const newTokenSet = await this.client.refreshToken()
          
          // Validate new token set
          if (!newTokenSet.access_token || !newTokenSet.refresh_token) {
            throw new AuthenticationError('Invalid refreshed token structure')
          }
          
          // Encrypt and save new tokens
          const encryptedTokens = crypto.encryptTokenSet(newTokenSet)
          
          await db.query(`
            UPDATE xero_tokens
            SET access_token = $1,
                refresh_token = $2,
                id_token = $3,
                expires_at = $4,
                updated_at = NOW()
            WHERE user_id = $5
          `, [
            encryptedTokens.access_token,
            encryptedTokens.refresh_token,
            encryptedTokens.id_token,
            new Date(newTokenSet.expires_at * 1000),
            userId
          ])

          // Clear cache
          await redis.delete(cacheKey)

          logger.info({
            event: 'TOKEN_REFRESHED',
            userId
          })

          // Update token set with new tokens
          tokenSet.access_token = newTokenSet.access_token
          tokenSet.refresh_token = newTokenSet.refresh_token
          tokenSet.id_token = newTokenSet.id_token
          tokenSet.expires_at = newTokenSet.expires_at
        } catch (refreshError) {
          logger.error({
            event: 'TOKEN_REFRESH_ERROR',
            userId,
            error: refreshError.message || refreshError.toString(),
            stack: refreshError.stack
          })
          throw new AuthenticationError('Failed to refresh Xero token. Please reconnect to Xero.')
        }
      }

      logger.info({
        event: 'GET_CLIENT_SUCCESS',
        userId
      })

      // Set tenant ID (only for real tokens, not mock)
      // Skip updateTenants for mock tokens to avoid API calls
      if (!decryptedTokens.access_token.includes('mock_')) {
        await this.client.updateTenants()
      }

      // Sync must use the same Xero org as OAuth saved in xero_tokens.xpm_tenant_id,
      // not tenants[0] (order from Xero is not guaranteed).
      const tenants = this.client.tenants || []
      const savedXpmId = tokenData.xpm_tenant_id
      let activeXeroTenantId = null
      if (savedXpmId && tenants.some((t) => t.tenantId === savedXpmId)) {
        activeXeroTenantId = savedXpmId
      } else if (tenants.length > 0) {
        activeXeroTenantId = tenants[0].tenantId    
      } else if (savedXpmId) {
        activeXeroTenantId = savedXpmId  
      }
      this.client.activeXeroTenantId = activeXeroTenantId

      return this.client
    } catch (error) {
      logger.error({
        event: 'GET_CLIENT_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Disconnect Xero integration
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   */
  async disconnect(userId, tenantId) {
    try {
      // Get client to revoke tokens
      try {
        const client = await this.getClientForUser(userId)
        const xeroTenant =
          client.activeXeroTenantId || client.tenants?.[0]?.tenantId
        if (xeroTenant) {
          await client.disconnect(xeroTenant)
        }
      } catch (error) {
        // Continue even if revocation fails
        logger.warn({
          event: 'TOKEN_REVOCATION_FAILED',
          userId,
          error: error.message
        })
      }

      // Delete tokens from database
      await db.query('DELETE FROM xero_tokens WHERE user_id = $1', [userId])

      // Clear cache
      await redis.delete(`xero:tokens:${userId}`)

      // Update integration status
      await this.updateIntegrationStatus(tenantId, 'disconnected', null)

      logger.info({
        event: 'XERO_DISCONNECTED',
        userId,
        tenantId
      })

      return { success: true }
    } catch (error) {
      logger.error({
        event: 'DISCONNECT_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get connection status
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Connection status
   */
  async getStatus(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          expires_at,
          xpm_tenant_id,
          xpm_tenant_name,
          xpm_tenant_type,
          created_at,
          updated_at
        FROM xero_tokens
        WHERE tenant_id = $1
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      `, [tenantId])

      if (result.rows.length === 0) {
        return {
          connected: false
        }
      }

      const token = result.rows[0]
      const now = new Date()
      const expiresAt = new Date(token.expires_at)
      const isExpired = expiresAt <= now

      return {
        connected: true,
        tenant: {
          id: token.xpm_tenant_id,
          name: token.xpm_tenant_name,
          type: token.xpm_tenant_type
        },
        expiresAt: token.expires_at,
        isExpired,
        connectedAt: token.created_at,
        lastUpdated: token.updated_at
      }
    } catch (error) {
      logger.error({
        event: 'GET_STATUS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update integration status in database
   * @param {string} tenantId - Tenant ID
   * @param {string} status - Status (connected, disconnected, error)
   * @param {string} errorMessage - Error message if status is error
   */
  async updateIntegrationStatus(tenantId, status, errorMessage = null) {
    try {
      await db.query(`
        INSERT INTO integrations (tenant_id, provider, status, error_message, updated_at)
        VALUES ($1, 'xero', $2, $3, NOW())
        ON CONFLICT (tenant_id, provider)
        DO UPDATE SET
          status = $2,
          error_message = $3,
          updated_at = NOW()
      `, [tenantId, status, errorMessage])
    } catch (error) {
      logger.error({
        event: 'UPDATE_INTEGRATION_STATUS_ERROR',
        tenantId,
        error: error.message
      })
    }
  }

  /**
   * Get all integrations for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - List of integrations
   */
  async getIntegrations(tenantId) {
    try {
      const result = await db.query(`
        SELECT 
          provider,
          status,
          last_sync_at,
          error_message,
          created_at,
          updated_at
        FROM integrations
        WHERE tenant_id = $1
        ORDER BY provider
      `, [tenantId])

      return result.rows
    } catch (error) {
      logger.error({
        event: 'GET_INTEGRATIONS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create invoice in Xero
   * @param {string} userId - User ID
   * @param {object} invoiceData - Invoice data
   * @returns {object} - Created invoice details
   */
  async createInvoice(userId, invoiceData) {
    try {
      const xeroClient = await this.getClientForUser(userId)
      
      // Format line items for Xero
      const lineItems = invoiceData.lineItems.map(item => ({
        description: item.description,
        quantity: item.hours || 1,
        unitAmount: item.rate,
        accountCode: '200', // Sales account code (adjust as needed)
        taxType: 'OUTPUT' // Tax type (adjust as needed)
      }))

      // Create invoice object for Xero
      const xeroInvoice = {
        type: 'ACCREC',
        contact: {
          name: invoiceData.clientName,
          emailAddress: invoiceData.clientEmail
        },
        date: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        lineItems: lineItems,
        reference: invoiceData.invoiceNumber, // Only use reference, not invoiceNumber
        status: 'DRAFT',
        //status: 'AUTHORISED',
        currencyCode: invoiceData.currency || 'AUD' // Default to AUD to avoid currency validation errors
      }

      logger.info({
        event: 'XERO_INVOICE_DATA',
        userId,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceData: xeroInvoice
      })

      // Create invoice in Xero
      const response = await xeroClient.accountingApi.createInvoices(
        xeroClient.activeXeroTenantId || xeroClient.tenants[0].tenantId,
        { invoices: [xeroInvoice] }
      )

      if (!response || !response.body || !response.body.invoices || response.body.invoices.length === 0) {
        throw new Error('Invalid response from Xero API: No invoice created')
      }

      const createdInvoice = response.body.invoices[0]

      logger.info({
        event: 'XERO_INVOICE_CREATED',
        userId,
        invoiceId: createdInvoice.invoiceID,
        xeroInvoiceNumber: createdInvoice.invoiceNumber,
        yourInvoiceNumber: invoiceData.invoiceNumber
      })

      return {
        xeroInvoiceId: createdInvoice.invoiceID,
        invoiceNumber: invoiceData.invoiceNumber, // Use your original invoice number
        xeroInvoiceNumber: createdInvoice.invoiceNumber, // Keep Xero's number for reference
        status: createdInvoice.status,
        success: true
      }
    } catch (error) {
      logger.error({
        event: 'XERO_CREATE_INVOICE_ERROR',
        userId,
        invoiceNumber: invoiceData.invoiceNumber,
        error: error.message || error.toString(),
        stack: error.stack
      })
      throw new Error(`Failed to create invoice in Xero: ${error.message || error.toString()}`)
    }
  }
}

module.exports = new XeroService()
