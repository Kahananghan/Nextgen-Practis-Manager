// ============================================
// src/modules/settings/settings.service.js
// Settings Management Service
// ============================================
const db = require('../../config/database')
const logger = require('../../utils/logger')

class SettingsService {
  /**
   * Get user settings
   * @param {string} userId - User ID
   * @returns {object} - User settings
   */
  async getUserSettings(userId) {
    try {
      const result = await db.query(
        'SELECT settings FROM user_settings WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        // Return defaults
        return {
          theme: 'light',
          language: 'en',
          timezone: 'Australia/Sydney',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          emailNotifications: true,
          desktopNotifications: true,
          dashboardLayout: 'default'
        }
      }

      return result.rows[0].settings
    } catch (error) {
      logger.error({
        event: 'GET_USER_SETTINGS_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {object} settings - Settings to update
   * @returns {object} - Updated settings
   */
  async updateUserSettings(userId, settings) {
    try {
      // Get current settings
      const current = await this.getUserSettings(userId)
      
      // Merge with new settings
      const updated = { ...current, ...settings }

      await db.query(`
        INSERT INTO user_settings (user_id, settings)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET settings = $2, updated_at = NOW()
      `, [userId, JSON.stringify(updated)])

      logger.info({
        event: 'USER_SETTINGS_UPDATED',
        userId
      })

      return updated
    } catch (error) {
      logger.error({
        event: 'UPDATE_USER_SETTINGS_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get tenant settings
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Tenant settings
   */
  async getTenantSettings(tenantId) {
    try {
      const result = await db.query(
        'SELECT settings FROM tenant_settings WHERE tenant_id = $1',
        [tenantId]
      )

      if (result.rows.length === 0) {
        // Return defaults
        return {
          companyName: '',
          companyLogo: null,
          businessHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'Australia/Sydney'
          },
          defaultJobPriority: 'Normal',
          defaultJobState: 'Planned',
          fiscalYearStart: '07-01',
          currency: 'AUD',
          taxRate: 10,
          brandColor: '#1976D2',
          features: {
            templates: true,
            reports: true,
            aiChat: false
          }
        }
      }

      return result.rows[0].settings
    } catch (error) {
      logger.error({
        event: 'GET_TENANT_SETTINGS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update tenant settings
   * @param {string} tenantId - Tenant ID
   * @param {object} settings - Settings to update
   * @returns {object} - Updated settings
   */
  async updateTenantSettings(tenantId, settings) {
    try {
      // Get current settings
      const current = await this.getTenantSettings(tenantId)
      
      // Merge with new settings
      const updated = { ...current, ...settings }

      await db.query(`
        INSERT INTO tenant_settings (tenant_id, settings)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id)
        DO UPDATE SET settings = $2, updated_at = NOW()
      `, [tenantId, JSON.stringify(updated)])

      logger.info({
        event: 'TENANT_SETTINGS_UPDATED',
        tenantId
      })

      return updated
    } catch (error) {
      logger.error({
        event: 'UPDATE_TENANT_SETTINGS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get billing settings
   * @param {string} tenantId - Tenant ID
   * @returns {object} - Billing settings
   */
  async getBillingSettings(tenantId) {
    try {
      // Get tenant with subscription
      const result = await db.query(`
        SELECT 
          t.name,
          s.plan_tier,
          s.billing_cycle,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.cancel_at_period_end
        FROM tenants t
        LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
        WHERE t.id = $1
      `, [tenantId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      
      return {
        companyName: row.name,
        currentPlan: row.plan_tier,
        billingCycle: row.billing_cycle,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end
      }
    } catch (error) {
      logger.error({
        event: 'GET_BILLING_SETTINGS_ERROR',
        tenantId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Reset user settings to defaults
   * @param {string} userId - User ID
   * @returns {object} - Default settings
   */
  async resetUserSettings(userId) {
    try {
      await db.query(
        'DELETE FROM user_settings WHERE user_id = $1',
        [userId]
      )

      logger.info({
        event: 'USER_SETTINGS_RESET',
        userId
      })

      return await this.getUserSettings(userId)
    } catch (error) {
      logger.error({
        event: 'RESET_USER_SETTINGS_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get all settings (user + tenant)
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {object} - All settings
   */
  async getAllSettings(userId, tenantId) {
    try {
      const [userSettings, tenantSettings] = await Promise.all([
        this.getUserSettings(userId),
        this.getTenantSettings(tenantId)
      ])

      return {
        user: userSettings,
        tenant: tenantSettings
      }
    } catch (error) {
      logger.error({
        event: 'GET_ALL_SETTINGS_ERROR',
        userId,
        tenantId,
        error: error.message
      })
      throw error
    }
  }
}

module.exports = new SettingsService()
