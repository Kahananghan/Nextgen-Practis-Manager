 // ============================================
// src/modules/auth/auth.validation.js - Auth Validation Schemas
// ============================================
const Joi = require('joi')

// Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message('Password must contain at least 8 characters, one uppercase, one lowercase, and one number')
  .required()

const authValidation = {
  // Login validation
  login: {
    body: Joi.object({
      email: Joi.string().email().lowercase().trim().required(),
      password: Joi.string().required()
    })
  },

  // Forgot password validation
  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().lowercase().trim().required()
    })
  },

  // Verify OTP validation
  verifyOTP: {
    body: Joi.object({
      email: Joi.string().email().lowercase().trim().required(),
      otp: Joi.string()
        .length(4)
        .pattern(/^[0-9]{4}$/)
        .message('OTP must be 4 digits')
        .required()
    })
  },

   // Resend OTP validation
  resendOTP: {
    body: Joi.object({
      email: Joi.string().email().lowercase().trim().required()
    })
  },

  // Reset password validation
  resetPassword: {
    body: Joi.object({
      resetToken: Joi.string().required(),
      password: passwordSchema
    })
  },

  // Refresh token validation
  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required()
    })
  },

  // Change password validation
  changePassword: {
    body: Joi.object({
      oldPassword: Joi.string().required(),
      newPassword: passwordSchema
    })
  }
}

module.exports = authValidation
