// ============================================
// src/modules/auth/auth.routes.js - Auth Routes
// ============================================
const authController = require('./auth.controller')
const authValidation = require('./auth.validation')
const { authenticate } = require('../../middleware/auth')

async function authRoutes(fastify, options) {
  // Attach database to server for controller access
  fastify.decorate('db', require('../../config/database'))

  /**
   * @route POST /auth/login
   * @desc Login user with email and password
   * @access Public
   */
  fastify.post('/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      //body: authValidation.login.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.login)

  /**
   * @route POST /auth/forgot-password
   * @desc Send password reset OTP to email
   * @access Public
   */
  fastify.post('/forgot-password', {
    schema: {
      description: 'Request password reset OTP',
      tags: ['Auth'],
      //body: authValidation.forgotPassword.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.forgotPassword)

  /**
   * @route POST /auth/verify-otp
   * @desc Verify OTP code and get reset token
   * @access Public
   */
  fastify.post('/verify-otp', {
    schema: {
      description: 'Verify OTP code',
      tags: ['Auth'],
      //body: authValidation.verifyOTP.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                resetToken: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.verifyOTP)

  /**
   * @route POST /auth/resend-otp
   * @desc Resend OTP to email
   * @access Public
   */
  fastify.post('/resend-otp', {
    schema: {
      description: 'Resend OTP to email',
      tags: ['Auth'],
      //body: authValidation.resendOTP.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.resendOTP)

  /**
   * @route POST /auth/reset-password
   * @desc Reset password with reset token
   * @access Public
   */
  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using reset token',
      tags: ['Auth'],
      //body: authValidation.resetPassword.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.resetPassword)

  /**
   * @route POST /auth/refresh-token
   * @desc Get new access token using refresh token
   * @access Public
   */
  fastify.post('/refresh-token', {
    schema: {
      description: 'Refresh access token',
      tags: ['Auth'],
      //body: authValidation.refreshToken.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                user: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, authController.refreshToken)

  /**
   * @route GET /auth/me
   * @desc Get current authenticated user
   * @access Private
   */
  fastify.get('/me', {
    preHandler: authenticate,
    schema: {
      description: 'Get current user profile',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { 
                  type: 'object',
                  additionalProperties: true
                 }
              }
            }
          }
        }
      }
    }
  }, authController.getCurrentUser)

  /**
   * @route POST /auth/change-password
   * @desc Change password for authenticated user
   * @access Private
   */
  fastify.post('/change-password', {
    preHandler: authenticate,
    schema: {
      description: 'Change password',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      //body: authValidation.changePassword.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.changePassword)

    /**
   * @route PUT /auth/profile
   * @desc Update user profile (name, email, phone)
   * @access Private
   */
  fastify.put('/profile', {
    preHandler: authenticate,
    schema: {
      description: 'Update user profile',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      //body: authValidation.updateProfile?.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                mobile: { type: 'string' }
              },
              additionalProperties: true
            }
          }
        }
      }
    }
  }, authController.updateProfile)

  /**
   * @route POST /auth/logout
   * @desc Logout user (client-side token removal)
   * @access Private
   */
  fastify.post('/logout', {
    preHandler: authenticate,
    schema: {
      description: 'Logout user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, authController.logout)
}

module.exports = authRoutes
