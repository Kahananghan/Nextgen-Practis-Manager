// ============================================
// src/config/r2.js - Cloudflare R2 (S3 compatible)
// ============================================
const { S3Client } = require('@aws-sdk/client-s3')
const config = require('./index')

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey
    }
  })
}

module.exports = {
  createR2Client
}

