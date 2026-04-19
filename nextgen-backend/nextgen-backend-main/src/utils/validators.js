// ============================================
// src/utils/validators.js - Common Validation Schemas
// ============================================
const Joi = require('joi')

// UUID validator
const uuidSchema = Joi.string().uuid({ version: 'uuidv4' })

// Email validator
const emailSchema = Joi.string().email().lowercase().trim()

// Password validator (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message('Password must contain at least 8 characters, one uppercase, one lowercase, and one number')

// Phone number validator (Australian format)
const phoneSchema = Joi.string()
  .pattern(/^\+?61[0-9]{9}$|^0[0-9]{9}$/)
  .message('Invalid Australian phone number format')

// OTP validator (4 digits)
const otpSchema = Joi.string()
  .length(4)
  .pattern(/^[0-9]{4}$/)
  .message('OTP must be 4 digits')

// Pagination validators
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}

// Date validators
const dateSchema = Joi.date().iso()

// Common object validators
const validators = {
  // Login
  login: Joi.object({
    email: emailSchema.required(),
    password: Joi.string().required()
  }),

  // Registration
  register: Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    name: Joi.string().min(2).max(255).required(),
    mobile: phoneSchema.optional()
  }),

  // Forgot Password
  forgotPassword: Joi.object({
    email: emailSchema.required()
  }),

  // Verify OTP
  verifyOtp: Joi.object({
    email: emailSchema.required(),
    otp: otpSchema.required()
  }),

  // Reset Password
  resetPassword: Joi.object({
    resetToken: Joi.string().required(),
    password: passwordSchema.required()
  }),

  // Update Profile
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    mobile: phoneSchema.optional()
  }),

  // Change Password
  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: passwordSchema.required()
  }),

  // Pagination
  pagination: Joi.object(paginationSchema),

  // UUID param
  uuidParam: Joi.object({
    id: uuidSchema.required()
  }),

  // Query filters
  jobFilters: Joi.object({
    clientId: uuidSchema.optional(),
    status: Joi.string().valid('Not Started', 'In Progress', 'Completed', 'Overdue').optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
    assignedTo: uuidSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    ...paginationSchema
  })
}

module.exports = validators
