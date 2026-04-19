// ============================================
// src/config/database.js - PostgreSQL Configuration
// ============================================
const { Pool } = require('pg')
const config = require('./index')
const logger = require('../utils/logger')

class Database {
  constructor() {
    this.pool = null
  }

  async connect() {
    try {
      this.pool = new Pool(config.database)

      // Test connection
      const client = await this.pool.connect()
      logger.info({
        event: 'DB_CONNECTION',
        status: 'SUCCESS',
        description: 'PostgreSQL connected successfully',
        database: config.database.database
      })
      client.release()

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error({
          event: 'DB_POOL_ERROR',
          status: 'ERROR',
          description: 'Unexpected error on idle client',
          error: err.message
        })
      })

      return this.pool
    } catch (error) {
      logger.error({
        event: 'DB_CONNECTION',
        status: 'FAILURE',
        description: 'Failed to connect to PostgreSQL',
        error: error.message
      })
      throw error
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      logger.info({
        event: 'DB_DISCONNECT',
        status: 'SUCCESS',
        description: 'PostgreSQL disconnected'
      })
    }
  }

  async query(text, params) {
    const start = Date.now()
    try {
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start

      if (config.isDevelopment) {
        logger.debug({
          event: 'DB_QUERY',
          duration: `${duration}ms`,
          rows: result.rowCount
        })
      }

      return result
    } catch (error) {
      logger.error({
        event: 'DB_QUERY_ERROR',
        status: 'ERROR',
        description: 'Database query failed',
        error: error.message,
        query: text.substring(0, 100) // Log first 100 chars
      })
      throw error
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error({
        event: 'DB_TRANSACTION_ERROR',
        status: 'ERROR',
        description: 'Transaction rolled back',
        error: error.message
      })
      throw error
    } finally {
      client.release()
    }
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW()')
      return {
        status: 'healthy',
        timestamp: result.rows[0].now
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}

module.exports = new Database()
