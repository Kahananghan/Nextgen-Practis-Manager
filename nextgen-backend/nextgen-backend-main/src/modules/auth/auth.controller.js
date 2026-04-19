// ============================================
// src/modules/auth/auth.controller.js - Auth Controller
// ============================================
const authService = require('./auth.service')
const logger = require('../../utils/logger')
const config = require('../../config')

class AuthController {
  /**
   * Login endpoint
   * POST /auth/login
   */
  async login(request, reply) {
    try {
      const { email, password } = request.body

      // Authenticate user
      const user = await authService.login(email, password)

      // Generate JWT tokens using Fastify JWT plugin
      const accessToken = request.server.jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          roles: user.roles || []
        },
        { expiresIn: config.jwt.expiresIn }
      )

      const refreshToken = request.server.jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          roles: user.roles || [],
          type: 'refresh'
        },
        { expiresIn: config.jwt.refreshExpiresIn }
      )

      return reply.send({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken
        }
      })
    } catch (error) {
      logger.error({
        event: 'LOGIN_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Forgot password endpoint
   * POST /auth/forgot-password
   */
  async forgotPassword(request, reply) {
    try {
      const { email } = request.body

      const result = await authService.forgotPassword(email)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'FORGOT_PASSWORD_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Verify OTP endpoint
   * POST /auth/verify-otp
   */
  async verifyOTP(request, reply) {
    try {
      const { email, otp } = request.body

      const result = await authService.verifyOTP(email, otp)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'VERIFY_OTP_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

    /**
   * Resend OTP endpoint
   * POST /auth/resend-otp
   */
  async resendOTP(request, reply) {
    try {
      const { email } = request.body

      // Use dedicated resendOTP logic
      const result = await authService.resendOTP(email)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'RESEND_OTP_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Reset password endpoint
   * POST /auth/reset-password
   */
  async resetPassword(request, reply) {
    try {
      const { resetToken, newPassword } = request.body

      const result = await authService.resetPassword(resetToken, newPassword)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'RESET_PASSWORD_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Refresh token endpoint
   * POST /auth/refresh-token
   */
  async refreshToken(request, reply) {
    try {
      const { refreshToken } = request.body

      // Validate input
      if (!refreshToken) {
        logger.error({
          event: 'REFRESH_TOKEN_VALIDATION_ERROR',
          userId: request.user?.userId,
          error: 'Refresh token is required'
        })
        return reply.code(400).send({
          success: false,
          error: {
            name: 'ValidationError',
            message: 'Refresh token is required',
            statusCode: 400
          }
        })
      }

      logger.info({
        event: 'REFRESH_TOKEN_ATTEMPT',
        userId: request.user?.userId,
        tenantId: request.user?.tenantId
      })

      // Verify refresh token
      const decoded = request.server.jwt.verify(refreshToken)
      logger.info({
        event: 'REFRESH_TOKEN_VERIFIED',
        userId: decoded.userId,
        type: decoded.type,
        exp: decoded.exp
      })

      if (decoded.type !== 'refresh') {
        logger.error({
          event: 'REFRESH_TOKEN_INVALID_TYPE',
          userId: request.user?.userId,
          error: 'Invalid token type - expected refresh, got:',
          tokenType: decoded.type
        })
        return reply.code(401).send({
          success: false,
          error: {
            name: 'AuthenticationError',
            message: 'Invalid refresh token',
            statusCode: 401
          }
        })
      }

      logger.info({
        event: 'REFRESH_TOKEN_USER_DATA_FETCH',
        userId: decoded.userId
      })
      // Get updated user data
      const user = await authService.refreshToken(decoded)
      logger.info({
        event: 'REFRESH_TOKEN_USER_DATA_RETRIEVED',
        userId: user.id,
        email: user.email
      })

      logger.info({
        event: 'REFRESH_TOKEN_ACCESS_TOKEN_GENERATION',
        userId: user.id
      })
      // Generate new access token
      const newAccessToken = request.server.jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          roles: user.roles || []
        },
        { expiresIn: config.jwt.expiresIn }
      )
      logger.info({
        event: 'REFRESH_TOKEN_ACCESS_TOKEN_GENERATED',
        userId: user.id
      })

      logger.info({
        event: 'REFRESH_TOKEN_COMPLETED',
        userId: user.id
      })
      return reply.send({
        success: true,
        data: {
          accessToken: newAccessToken,
          user
        }
      })
    } catch (error) {
      console.error('Refresh token error:', {
        error: error.message,
        stack: error.stack,
        body: request.body
      })
      logger.error({
        event: 'REFRESH_TOKEN_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(401).send({
        success: false,
        error: {
          name: 'AuthenticationError',
          message: 'Invalid or expired refresh token',
          statusCode: 401
        }
      })
    }
  }

  /**
   * Get current user endpoint
   * GET /auth/me
   */
  async getCurrentUser(request, reply) {
    try {
      // User is already attached by auth middleware
      const userId = request.user.userId

      const result = await request.server.db.query(`
        SELECT 
          u.id,
          u.tenant_id,
          u.email,
          u.name,
          u.mobile,
          u.avatar,
          u.status,
          u.last_login,
          t.name as tenant_name
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1
      `, [userId])

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            name: 'NotFoundError',
            message: 'User not found',
            statusCode: 404
          }
        })
      }

      const user = result.rows[0]

      // Fetch user roles
      const rolesResult = await request.server.db.query(`
        SELECT r.name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `, [userId])

      user.roles = rolesResult.rows.map(row => row.name)

      return reply.send({
        success: true,
        data: {
          user
        }
      })
    } catch (error) {
      logger.error({
        event: 'GET_CURRENT_USER_ERROR',
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Failed to fetch user data',
          statusCode: 500
        }
      })
    }
  }

  /**
   * Change password endpoint
   * POST /auth/change-password
   */
  async changePassword(request, reply) {
    try {
      const { oldPassword, newPassword } = request.body
      const userId = request.user.userId

      const result = await authService.changePassword(userId, oldPassword, newPassword)

      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error({
        event: 'CHANGE_PASSWORD_CONTROLLER_ERROR',
        error: error.message
      })
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      })
    }
  }

  /**
   * Update profile endpoint
   * PUT /auth/profile
   */
  async updateProfile(request, reply) {
    try {
      const userId = request.user.userId;
      const updates = request.body;
      const updatedUser = await authService.updateProfile(userId, updates);
      return reply.send({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      logger.error({
        event: 'UPDATE_PROFILE_CONTROLLER_ERROR',
        error: error.message
      });
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode || 500
        }
      });
    }
  }

  /**
   * Logout endpoint
   * POST /auth/logout
   */
  async logout(request, reply) {
    try {

      // Add token to blacklist in Redis to prevent reuse
      const token = request.headers.authorization?.split(' ')[1]
      
      if (token) {
        try {
          const decoded = request.server.jwt.decode(token)
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000)
          
          // Add to blacklist with expiration
          await redis.set(`blacklist:${token}`, '1', expiresIn)
        } catch (decodeError) {
          logger.error({
            event: 'LOGOUT_TOKEN_DECODE_ERROR',
            userId: request.user?.userId,
            error: decodeError.message
          })
        }
      }

      // Mark user offline in database (presence)
      try {
        const result = await request.server.db.query("UPDATE users SET status = 'inactive' WHERE id = $1", [
          request.user.userId
        ])
        
        // Also clear presence from Redis if using Redis for presence tracking
        await redis.del(`presence:${request.user.userId}`)
        
      } catch (dbError) {
        console.error('Failed to update user status to inactive:', dbError.message)
        // Do not fail logout on presence update
      }

      return reply.send({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      })
    } catch (error) {
      logger.error({
        event: 'LOGOUT_ERROR',
        userId: request.user?.userId,
        error: error.message
      })
      return reply.code(500).send({
        success: false,
        error: {
          name: 'InternalServerError',
          message: 'Logout failed',
          statusCode: 500
        }
      })
    }
  }
}

module.exports = new AuthController()
