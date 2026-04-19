// ============================================
// src/config/redis.js - Redis Configuration
// ============================================
const Redis = require('ioredis')
const config = require('./index')
const logger = require('../utils/logger')

class RedisClient {
  constructor() {
    this.client = null
  }

  connect() {
    try {
      this.client = new Redis(config.redis)

      this.client.on('connect', () => {
        logger.info({
          event: 'REDIS_CONNECTION',
          status: 'SUCCESS',
          description: 'Redis connected successfully'
        })
      })

      this.client.on('error', (err) => {
        logger.error({
          event: 'REDIS_ERROR',
          status: 'ERROR',
          description: 'Redis connection error',
          error: err.message
        })
      })

      this.client.on('close', () => {
        logger.warn({
          event: 'REDIS_CLOSE',
          status: 'WARNING',
          description: 'Redis connection closed'
        })
      })

      return this.client
    } catch (error) {
      logger.error({
        event: 'REDIS_CONNECTION',
        status: 'FAILURE',
        description: 'Failed to connect to Redis',
        error: error.message
      })
      throw error
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit()
      logger.info({
        event: 'REDIS_DISCONNECT',
        status: 'SUCCESS',
        description: 'Redis disconnected'
      })
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error({
        event: 'REDIS_GET_ERROR',
        key,
        error: error.message
      })
      return null
    }
  }

  async set(key, value, expirySeconds = null) {
    try {
      const serialized = JSON.stringify(value)
      if (expirySeconds) {
        await this.client.setex(key, expirySeconds, serialized)
      } else {
        await this.client.set(key, serialized)
      }
      return true
    } catch (error) {
      logger.error({
        event: 'REDIS_SET_ERROR',
        key,
        error: error.message
      })
      return false
    }
  }

  async delete(key) {
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      logger.error({
        event: 'REDIS_DELETE_ERROR',
        key,
        error: error.message
      })
      return false
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error({
        event: 'REDIS_EXISTS_ERROR',
        key,
        error: error.message
      })
      return false
    }
  }

  async healthCheck() {
    try {
      const result = await this.client.ping()
      return {
        status: 'healthy',
        response: result
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}

module.exports = new RedisClient()
