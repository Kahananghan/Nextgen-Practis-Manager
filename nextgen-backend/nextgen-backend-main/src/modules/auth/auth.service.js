 // ============================================
// src/modules/auth/auth.service.js - Authentication Service
// ============================================
const db = require('../../config/database')
const crypto = require('../../utils/crypto')
const logger = require('../../utils/logger')
const { 
  AuthenticationError, 
  ValidationError, 
  NotFoundError 
} = require('../../utils/errors')
const emailService = require('../../utils/emailService')

class AuthService {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - Plain password
   * @returns {object} - User data and tokens
   */
  async login(email, password) {
    try {
      // Find user by email
      const result = await db.query(`
        SELECT 
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.name,
          u.mobile,
          u.avatar,
          u.status,
          t.name as tenant_name,
          t.status as tenant_status
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.email = $1
      `, [email.toLowerCase()])

      if (result.rows.length === 0) {
        throw new AuthenticationError('Invalid email or password')
      }

      const user = result.rows[0]

      // Check user status - allow inactive users to reactivate their account
      if (user.status === 'pending') {
        throw new AuthenticationError('Account is pending activation')
      }
      // Note: 'inactive' users can log in to reactivate their account

      // Check tenant status
      if (user.tenant_status !== 'active') {
        throw new AuthenticationError('Organization account is not active')
      }

      // Verify password
      const isValidPassword = await crypto.comparePassword(password, user.password_hash)
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password')
      }

      // Update last login
      await db.query(
        "UPDATE users SET last_login = NOW(), status = 'active' WHERE id = $1",
        [user.id]
      )

      // Remove sensitive data
      delete user.password_hash
      delete user.tenant_status

      // Fetch user roles
      const rolesResult = await db.query(`
        SELECT r.name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `, [user.id])

      user.roles = rolesResult.rows.map(row => row.name)

      // Fetch linked xpm_staff info
      const staffResult = await db.query(`
        SELECT xs.id, xs.name, xs.email, xs.role as staff_role
        FROM user_staff_mapping usm
        JOIN xpm_staff xs ON usm.xpm_staff_id = xs.id
        WHERE usm.user_id = $1
      `, [user.id])

      if (staffResult.rows.length > 0) {
        user.staff = staffResult.rows[0]
        user.xpmStaffId = staffResult.rows[0].id
      }

      logger.info({
        event: 'USER_LOGIN',
        userId: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        status: 'SUCCESS'
      })

      return user
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      logger.error({
        event: 'LOGIN_ERROR',
        email,
        error: error.message
      })
      throw new AuthenticationError('Login failed')
    }
  }

  /**
   * Generate JWT access and refresh tokens
   * @param {object} user - User object
   * @returns {object} - Access and refresh tokens
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roles: user.roles || []
    }

    // Note: Token generation will be handled by Fastify JWT plugin
    return payload
  }

  /**
   * Send password reset OTP
   * @param {string} email - User email
   * @returns {object} - Success message
   */
  async forgotPassword(email) {
    try {
      // Check if user exists
      const userResult = await db.query(
        'SELECT id, email, name FROM users WHERE email = $1',
        [email.toLowerCase()]
      )

      // Don't reveal if user exists or not (security)
      if (userResult.rows.length === 0) {
        logger.warn({
          event: 'FORGOT_PASSWORD_UNKNOWN_EMAIL',
          email
        })
        return {
          success: true,
          message: 'If an account exists, a verification code has been sent'
        }
      }

      const user = userResult.rows[0]

      // Generate 4-digit OTP
      const otp = crypto.generateOTP(4)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Save OTP to database
      await db.query(`
        INSERT INTO otp_codes (email, code, purpose, expires_at)
        VALUES ($1, $2, 'password_reset', $3)
      `, [email.toLowerCase(), otp, expiresAt])

      // TODO: Send email with OTP
      // For now, log it (development only)
      logger.info({
        event: 'OTP_GENERATED',
        email: user.email,
        otp: process.env.NODE_ENV === 'development' ? otp : '****',
        expiresAt
      })

      // In production, send email here
      await emailService.sendOTP(user.email, user.name, otp)

      return {
        success: true,
        message: 'If an account exists, a verification code has been sent',
        // Only in development
        ...(process.env.NODE_ENV === 'development' && { otp, email: user.email })
      }
    } catch (error) {
      logger.error({
        event: 'FORGOT_PASSWORD_ERROR',
        email,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - User email
   * @param {string} code - 4-digit OTP
   * @returns {object} - Reset token
   */
  async verifyOTP(email, code) {
    try {
      // Find valid OTP
      const result = await db.query(`
        SELECT id, email, code, expires_at
        FROM otp_codes
        WHERE email = $1
          AND code = $2
          AND purpose = 'password_reset'
          AND is_used = false
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `, [email.toLowerCase(), code])

      if (result.rows.length === 0) {
        throw new ValidationError('Invalid or expired verification code')
      }

      const otp = result.rows[0]

      // Mark OTP as used
      await db.query(
        'UPDATE otp_codes SET is_used = true WHERE id = $1',
        [otp.id]
      )

      // Generate temporary reset token (valid for 15 minutes)
      const resetToken = crypto.encrypt(
        JSON.stringify({
          email: otp.email,
          timestamp: Date.now(),
          otpId: otp.id
        })
      )

      logger.info({
        event: 'OTP_VERIFIED',
        email: otp.email,
        status: 'SUCCESS'
      })

      return {
        success: true,
        resetToken,
        email: otp.email
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      logger.error({
        event: 'VERIFY_OTP_ERROR',
        email,
        error: error.message
      })
      throw new ValidationError('OTP verification failed')
    }
  }

    /**
   * Resend OTP (does not mark old OTPs as used, just generates and sends a new one)
   * @param {string} email - User email
   * @returns {object} - Success message
   */
  async resendOTP(email) {
    try {
      // Check if user exists
      const userResult = await db.query(
        'SELECT id, email, name FROM users WHERE email = $1',
        [email.toLowerCase()]
      )

      // Don't reveal if user exists or not (security)
      if (userResult.rows.length === 0) {
        logger.warn({
          event: 'RESEND_OTP_UNKNOWN_EMAIL',
          email
        })
        return {
          success: true,
          message: 'If an account exists, a verification code has been sent'
        }
      }

      const user = userResult.rows[0]

      // Generate 4-digit OTP
      const otp = crypto.generateOTP(4)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Save OTP to database (do not mark old OTPs as used)
      await db.query(`
        INSERT INTO otp_codes (email, code, purpose, expires_at)
        VALUES ($1, $2, 'password_reset', $3)
      `, [email.toLowerCase(), otp, expiresAt])

      // TODO: Send email with OTP
      // For now, log it (development only)
      logger.info({
        event: 'OTP_RESENT',
        email: user.email,
        otp: process.env.NODE_ENV === 'development' ? otp : '****',
        expiresAt
      })

      // In production, send email here
      await emailService.sendOTP(user.email, user.name, otp)

      return {
        success: true,
        message: 'If an account exists, a verification code has been sent',
        ...(process.env.NODE_ENV === 'development' && { otp, email: user.email })
      }
    } catch (error) {
      logger.error({
        event: 'RESEND_OTP_ERROR',
        email,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Reset password with reset token
   * @param {string} resetToken - Temporary reset token from OTP verification
   * @param {string} newPassword - New password
   * @returns {object} - Success message
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Check for missing or empty reset token
      if (!resetToken) {
        throw new ValidationError('Missing reset token. Please use the link from your email.');
      }
      let decrypted, tokenData;
      try {
        decrypted = crypto.decrypt(resetToken);
        tokenData = JSON.parse(decrypted);
      } catch (err) {
        logger.error({ event: 'RESET_TOKEN_DECRYPT_ERROR', error: err.message });
        throw new ValidationError('Invalid or corrupted reset token. Please request a new code.');
      }
      if (!tokenData || !tokenData.timestamp || !tokenData.email || !tokenData.otpId) {
        throw new ValidationError('Malformed reset token. Please request a new code.');
      }

      // Check token age (15 minutes max)
      const tokenAge = Date.now() - tokenData.timestamp;
      if (tokenAge > 15 * 60 * 1000) {
        throw new ValidationError('Reset token has expired. Please request a new code.');
      }

      // Verify OTP was actually used
      const otpResult = await db.query(
        'SELECT is_used FROM otp_codes WHERE id = $1',
        [tokenData.otpId]
      );
      if (otpResult.rows.length === 0 || !otpResult.rows[0].is_used) {
        throw new ValidationError('Invalid reset token');
      }

      // Hash new password
      const passwordHash = await crypto.hashPassword(newPassword);

      // Update password
      const updateResult = await db.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE email = $2
        RETURNING id, email
      `, [passwordHash, tokenData.email]);
      if (updateResult.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const user = updateResult.rows[0];

      // Delete all OTPs for this user (cleanup)
      await db.query(
        'DELETE FROM otp_codes WHERE email = $1',
        [tokenData.email]
      );

      logger.info({
        event: 'PASSWORD_RESET',
        userId: user.id,
        email: user.email,
        status: 'SUCCESS'
      });

      return {
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error({
        event: 'RESET_PASSWORD_ERROR',
        error: error.message
      });
      throw new ValidationError('Password reset failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {object} user - User payload from refresh token
   * @returns {object} - User data for new token
   */
  async refreshToken(user) {
    try {
      // Verify user still exists and is active
      const result = await db.query(`
        SELECT 
          u.id,
          u.tenant_id,
          u.email,
          u.name,
          u.status,
          t.status as tenant_status
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1
      `, [user.userId])

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found')
      }

      const userData = result.rows[0]

      if (userData.status !== 'active') {
        throw new AuthenticationError('Account is not active')
      }

      if (userData.tenant_status !== 'active') {
        throw new AuthenticationError('Organization account is not active')
      }

      logger.info({
        event: 'TOKEN_REFRESH',
        userId: userData.id,
        email: userData.email,
        status: 'SUCCESS'
      })

      delete userData.tenant_status
      delete userData.status

      return userData
    } catch (error) {
      logger.error({
        event: 'REFRESH_TOKEN_ERROR',
        userId: user.userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Register new user (for future implementation)
   * @param {object} userData - User registration data
   * @returns {object} - Created user
   */
  async register(userData) {
    // TODO: Implement user registration
    // This will be used when adding public signup
    throw new Error('Registration not yet implemented')
  }

  /**
   * Change password for authenticated user
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {object} - Success message
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Get current password hash
      const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found')
      }

      // Verify old password
      const isValid = await crypto.comparePassword(oldPassword, result.rows[0].password_hash)
      if (!isValid) {
        throw new ValidationError('Current password is incorrect')
      }

      // Hash new password
      const newHash = await crypto.hashPassword(newPassword)

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      )

      logger.info({
        event: 'PASSWORD_CHANGED',
        userId,
        status: 'SUCCESS'
      })

      return {
        success: true,
        message: 'Password changed successfully'
      }
    } catch (error) {
      logger.error({
        event: 'CHANGE_PASSWORD_ERROR',
        userId,
        error: error.message
      })
      throw error
    }
  }

   /**
   * Update user profile (name, email, mobile)
   * @param {string} userId - User ID
   * @param {object} updates - Fields to update (name, email, mobile)
   * @returns {object} - Updated user
   */
  async updateProfile(userId, updates) {
    try {
      const allowedFields = ['name', 'email', 'mobile'];
      const setClauses = [];
      const params = [];
      let paramIndex = 1;
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          setClauses.push(`${key} = $${paramIndex}`);
          params.push(updates[key]);
          paramIndex++;
        }
      }
      if (setClauses.length === 0) {
        throw new ValidationError('No valid fields to update');
      }
      params.push(userId);
      const setString = setClauses.join(', ');
      const result = await db.query(
        `UPDATE users SET ${setString}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, name, email, mobile`,
        params
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      logger.info({
        event: 'PROFILE_UPDATED',
        userId,
        fields: Object.keys(updates)
      });
      return result.rows[0];
    } catch (error) {
      logger.error({
        event: 'UPDATE_PROFILE_ERROR',
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new AuthService()
