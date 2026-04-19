// ============================================
// src/utils/crypto.js - Token Encryption Utility
// AES-256-GCM Symmetric Encryption
// ============================================
const crypto = require('crypto')
const config = require('../config')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // For AES, this is always 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits

class CryptoUtil {
  constructor() {
    this.encryptionKey = this.getEncryptionKey()
  }

  /**
   * Get encryption key from environment variable
   * Key must be 32 bytes (256 bits) for AES-256
   */
  getEncryptionKey() {
    const key = config.encryption.key
    
    if (!key) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set')
    }

    // Convert base64 key to buffer
    const keyBuffer = Buffer.from(key, 'base64')
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits)`)
    }

    return keyBuffer
  }

  /**
   * Encrypt a token string
   * @param {string} plaintext - The token to encrypt
   * @returns {string} - Base64 encoded encrypted token with IV and auth tag
   */
  encrypt(plaintext) {
    if (!plaintext) {
      return null
    }

    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH)

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get the authentication tag
      const authTag = cipher.getAuthTag()

      // Combine IV + Auth Tag + Encrypted Data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ])

      // Return as base64 string
      return combined.toString('base64')
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
  }

  /**
   * Decrypt an encrypted token
   * @param {string} encryptedData - Base64 encoded encrypted token
   * @returns {string} - Decrypted token
   */
  decrypt(encryptedData) {
    if (!encryptedData) {
      return null
    }

    try {
      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64')

      // Extract IV, auth tag, and encrypted data
      const iv = combined.slice(0, IV_LENGTH)
      const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
      const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH)

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
      decipher.setAuthTag(authTag)

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
  }

  /**
   * Encrypt multiple tokens in an object
   * @param {object} tokenSet - Object containing tokens
   * @returns {object} - Object with encrypted tokens
   */
  encryptTokenSet(tokenSet) {
    if (!tokenSet) {
      return null
    }

    return {
      access_token: this.encrypt(tokenSet.access_token),
      refresh_token: this.encrypt(tokenSet.refresh_token),
      id_token: tokenSet.id_token ? this.encrypt(tokenSet.id_token) : null
    }
  }

  /**
   * Decrypt multiple tokens in an object
   * @param {object} encryptedTokenSet - Object containing encrypted tokens
   * @returns {object} - Object with decrypted tokens
   */
  decryptTokenSet(encryptedTokenSet) {
    if (!encryptedTokenSet) {
      return null
    }

    return {
      access_token: this.decrypt(encryptedTokenSet.access_token),
      refresh_token: this.decrypt(encryptedTokenSet.refresh_token),
      id_token: encryptedTokenSet.id_token ? this.decrypt(encryptedTokenSet.id_token) : null
    }
  }

  /**
   * Generate a new encryption key (256-bit)
   * Use this to generate TOKEN_ENCRYPTION_KEY for your .env file
   * @returns {string} - Base64 encoded key
   */
  static generateKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('base64')
  }

  /**
   * Hash password with bcrypt
   * @param {string} password - Plain password
   * @returns {string} - Hashed password
   */
  async hashPassword(password) {
    const bcrypt = require('bcrypt')
    return bcrypt.hash(password, 10)
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain password
   * @param {string} hash - Hashed password
   * @returns {boolean} - Match result
   */
  async comparePassword(password, hash) {
    const bcrypt = require('bcrypt')
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate random OTP
   * @param {number} length - OTP length (default: 4)
   * @returns {string} - OTP code
   */
  generateOTP(length = 4) {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp
  }
}

module.exports = new CryptoUtil()
