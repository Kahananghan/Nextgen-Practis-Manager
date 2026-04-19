// ============================================
// src/realtime/socket.js - Socket.IO realtime chat + presence
// ============================================
const { Server } = require('socket.io')
const config = require('../config')
const logger = require('../utils/logger')
const redis = require('../config/redis')
const db = require('../config/database')
const chatService = require('../modules/chat/chat.service')

function presenceKey(userId) {
  return `presence:connections:${userId}`
}

async function setUserStatus(userId, status) {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId])
}

function setupSocket(app) {
  const io = new Server(app.server, {
    cors: {
      origin: config.security.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST']
    }
  })

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1]

      if (!token) {
        const err = new Error('Missing auth token')
        err.data = { code: 'AUTH_MISSING' }
        return next(err)
      }

      const payload = app.jwt.verify(token)
      if (!payload?.userId) {
        const err = new Error('Invalid auth token')
        err.data = { code: 'AUTH_INVALID' }
        return next(err)
      }

      socket.user = payload
      return next()
    } catch (e) {
      const err = new Error('Unauthorized')
      err.data = { code: 'AUTH_UNAUTHORIZED' }
      return next(err)
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user.userId

    try {
      const count = await redis.client.incr(presenceKey(userId))
      if (count === 1) {
        await setUserStatus(userId, 'active')
        io.emit('user_online', { userId })
      }

      socket.join(`user:${userId}`)

      logger.info({ event: 'SOCKET_CONNECTED', userId, connections: count })
    } catch (e) {
      logger.error({ event: 'SOCKET_PRESENCE_CONNECT_ERROR', userId, error: e.message })
    }

    socket.on('send_message', async (payload, cb) => {
      try {
        const receiverId = payload?.receiverId
        const message = payload?.message || null
        const fileKey = payload?.fileKey || null
        const fileName = payload?.fileName || null
        const fileSize = payload?.fileSize || null

        if (!receiverId || (!message && !fileKey)) {
          return cb?.({ ok: false, error: 'Invalid payload' })
        }

        const saved = await chatService.saveMessage({
          senderId: userId,
          receiverId,
          message,
          fileKey,
          fileName,
          fileSize
        })

        const outgoing = {
          ...saved,
          file: saved.file?.key
            ? { 
                key: saved.file.key, 
                url: await chatService.presignForKey(saved.file.key),
                name: saved.file.name || 'Unknown file',
                size: saved.file.size || 0
              }
            : null
        }

        io.to(`user:${receiverId}`).emit('receive_message', outgoing)
        socket.emit('receive_message', outgoing) // echo for sender

        cb?.({ ok: true, message: outgoing })
      } catch (e) {
        logger.error({ event: 'SOCKET_SEND_MESSAGE_ERROR', userId, error: e.message })
        cb?.({ ok: false, error: 'Failed to send message' })
      }
    })

    socket.on('disconnect', async () => {
      try {
        const key = presenceKey(userId)
        const count = await redis.client.decr(key)
        const normalized = Math.max(0, count)
        if (normalized === 0) {
          await redis.client.del(key)
          await setUserStatus(userId, 'inactive')
          io.emit('user_offline', { userId })
        }
        logger.info({ event: 'SOCKET_DISCONNECTED', userId, connections: normalized })
      } catch (e) {
        logger.error({ event: 'SOCKET_PRESENCE_DISCONNECT_ERROR', userId, error: e.message })
      }
    })
  })

  app.decorate('io', io)
  return io
}

module.exports = setupSocket

