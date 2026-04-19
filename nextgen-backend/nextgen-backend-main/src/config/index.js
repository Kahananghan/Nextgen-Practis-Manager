// ============================================
// src/config/index.js - Centralized Configuration
// ============================================
require('dotenv').config()
const Joi = require('joi')

// Environment variable schema validation
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_POOL_MIN: Joi.number().default(2),
  DB_POOL_MAX: Joi.number().default(20),
  DB_SSL: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Session
  SESSION_SECRET: Joi.string().min(32).required(),
  SESSION_MAX_AGE: Joi.number().default(86400000), // 24 hours

  // Token Encryption
  TOKEN_ENCRYPTION_KEY: Joi.string().required(),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY: Joi.string().required(),
  R2_SECRET_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_ENDPOINT: Joi.string().uri().optional(),

  // Xero
  XERO_CLIENT_ID: Joi.string().required(),
  XERO_CLIENT_SECRET: Joi.string().required(),
  XERO_REDIRECT_URI: Joi.string().uri().required(),
  XERO_SCOPES: Joi.string().required(),

  // Security
  RATE_LIMIT_MAX: Joi.number().default(100),
  RATE_LIMIT_TIME_WINDOW: Joi.string().default('15m'),
  CORS_ORIGIN: Joi.string().default('*'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),

  // Frontend
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173')
}).unknown()

const { error, value: env } = envSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  server: {
    port: env.PORT,
    host: env.HOST
  },

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: env.DB_SSL
      ? { rejectUnauthorized: false }
      : (env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false)
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined, maxRetriesPerRequest: null,
    tls: env.REDIS_TLS ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    }
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },

  session: {
    secret: env.SESSION_SECRET,
    maxAge: env.SESSION_MAX_AGE,
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  },

  encryption: {
    key: env.TOKEN_ENCRYPTION_KEY
  },

  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
    bucketName: env.R2_BUCKET_NAME,
    endpoint:
      env.R2_ENDPOINT ||
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  },

  xero: {
    clientId: env.XERO_CLIENT_ID,
    clientSecret: env.XERO_CLIENT_SECRET,
    redirectUris: [env.XERO_REDIRECT_URI],
    scopes: env.XERO_SCOPES.split(' ')
  },

  security: {
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_TIME_WINDOW
    },
    corsOrigin: env.CORS_ORIGIN
  },

  logging: {
    level: env.LOG_LEVEL
  },

  frontend: {
    url: env.FRONTEND_URL
  }
}

module.exports = config
