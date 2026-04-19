// ============================================
// src/config/xero.js - Xero Client Configuration
// ============================================
const { XeroClient } = require('xero-node')
const config = require('./index')

class XeroClientFactory {
  createClient() {
    return new XeroClient(config.xero)
  }

  getConfig() {
    return config.xero
  }
}

module.exports = new XeroClientFactory()
