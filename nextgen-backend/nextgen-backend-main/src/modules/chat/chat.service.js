// ============================================
// src/modules/chat/chat.service.js - Chat Service
// ============================================
const db = require('../../config/database')
const { encryptMessage, decryptMessage } = require('../../utils/message-encryption')
const { createR2Client } = require('../../config/r2')
const config = require('../../config')
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const crypto = require('crypto')
const path = require('path')
const { Readable } = require('stream')

const r2 = createR2Client()

function safeFilename(originalName) {
  const base = path.basename(originalName || 'file')
  return base.replace(/[^\w.\-()+@]/g, '_')
}

function makeObjectKey(originalName) {
  const id = crypto.randomUUID()
  return `chat-media/${id}-${safeFilename(originalName)}`
}

async function presignGetUrl(objectKey, expiresInSeconds = 60 * 60) {
  if (!objectKey) return null
  const cmd = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: objectKey
  })
  return getSignedUrl(r2, cmd, { expiresIn: expiresInSeconds })
}

class ChatService {
  async listUsers({ tenantId, excludeUserId }) {
    const result = await db.query(
      `
      SELECT id, name, email, avatar, status
      FROM users
      WHERE tenant_id = $1
        AND id <> $2
      ORDER BY name ASC
      `,
      [tenantId, excludeUserId]
    )
    return result.rows
  }

  async getHistory({ tenantId, userId, otherUserId, limit = 100 }) {
    const result = await db.query(
      `
      SELECT id, sender_id, receiver_id, message, file_url, created_at
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      LIMIT $3
      `,
      [userId, otherUserId, limit]
    )

    const rows = await Promise.all(
      result.rows.map(async (r) => ({
        id: r.id,
        senderId: r.sender_id,
        receiverId: r.receiver_id,
        message: r.message ? decryptMessage(r.message) : null,
        file: r.file_url
          ? { key: r.file_url, url: await presignGetUrl(r.file_url) }
          : null,
        createdAt: r.created_at
      }))
    )

    return rows
  }

  async saveMessage({ senderId, receiverId, message, fileKey, fileName, fileSize }) {
    const encrypted = message ? encryptMessage(message) : null
    const result = await db.query(
      `
      INSERT INTO messages (sender_id, receiver_id, message, file_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id, receiver_id, message, file_url, created_at
      `,
      [senderId, receiverId, encrypted, fileKey || null]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      message: row.message ? decryptMessage(row.message) : null,
      file: row.file_url ? { 
        key: row.file_url,
        name: fileName || 'Unknown file',
        size: fileSize || 0
      } : null,
      createdAt: row.created_at
    }
  }

  async uploadToR2({ stream, contentType, filename }) {
    const objectKey = makeObjectKey(filename)

    // Get file size to set ContentLength properly
    const chunks = []
    let totalSize = 0
    
    for await (const chunk of stream) {
      chunks.push(chunk)
      totalSize += chunk.length
    }
    
    // Create a readable stream from chunks
    const combinedStream = Readable.from(chunks)

    await r2.send(
      new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: objectKey,
        Body: combinedStream,
        ContentType: contentType || 'application/octet-stream',
        ContentLength: totalSize
      })
    )

    return {
      key: objectKey,
      url: await presignGetUrl(objectKey)
    }
  }

  async presignForKey(objectKey, expiresInSeconds) {
    return presignGetUrl(objectKey, expiresInSeconds)
  }
}

module.exports = new ChatService()

