// ============================================
// src/utils/message-encryption.js - Chat message encryption helpers
// Uses AES-256-GCM via existing crypto util
// ============================================
const cryptoUtil = require('./crypto')

function encryptMessage(plaintext) {
  if (plaintext === null || plaintext === undefined) return null
  const trimmed = String(plaintext)
  if (!trimmed) return null
  return cryptoUtil.encrypt(trimmed)
}

function decryptMessage(ciphertext) {
  if (!ciphertext) return null
  return cryptoUtil.decrypt(ciphertext)
}

module.exports = {
  encryptMessage,
  decryptMessage
}

