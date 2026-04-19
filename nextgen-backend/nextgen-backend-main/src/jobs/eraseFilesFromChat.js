// src/jobs/eraseFilesFromChat.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../config/database');
const logger = require('../utils/logger');

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/**
 * Delete file from Cloudflare R2
 * @param {string} fileUrl - Full file URL
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFileFromR2(fileUrl) {
  try {
    // Extract object key from file URL
    // Example: https://pub-xxxxxxxx.r2.dev/chat-media/abc123.jpg -> chat-media/abc123.jpg
    const urlParts = fileUrl.split('/');
    const objectKey = urlParts.slice(-2).join('/'); // Get last 2 parts: chat-media/filename
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });

    await r2Client.send(deleteCommand);
    return true;
  } catch (error) {
    logger.error({
      event: 'R2_FILE_DELETE_ERROR',
      fileUrl,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get old messages with files
 * @returns {Promise<Array>} - Array of message records
 */
async function getOldMessagesWithFiles() {
  try {
    const result = await db.query(`
      SELECT id, file_url 
      FROM messages 
      WHERE file_url IS NOT NULL 
      AND created_at < NOW() - INTERVAL '7 days'
      ORDER BY created_at ASC
    `);
    return result.rows;
  } catch (error) {
    logger.error({
      event: 'DB_QUERY_ERROR',
      error: error.message,
    });
    return [];
  }
}

/**
 * Delete message from database
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteMessageFromDB(messageId) {
  try {
    await db.query('DELETE FROM messages WHERE id = $1', [messageId]);
    return true;
  } catch (error) {
    logger.error({
      event: 'DB_DELETE_ERROR',
      messageId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Main job function to erase old chat files
 */
async function eraseFilesFromChat() {
  try {
    // Get all messages with files older than 7 days
    const messages = await getOldMessagesWithFiles();
    
    if (messages.length === 0) {
      return; // No files to process
    }

    let deletedCount = 0;
    let failedCount = 0;

    // Process each message
    for (const message of messages) {
      try {
        // Delete file from R2 first
        const fileDeleted = await deleteFileFromR2(message.file_url);
        
        if (fileDeleted) {
          // Delete message from database
          const messageDeleted = await deleteMessageFromDB(message.id);
          
          if (messageDeleted) {
            deletedCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        logger.error({
          event: 'MESSAGE_PROCESS_ERROR',
          messageId: message.id,
          error: error.message,
        });
      }
    }

    logger.info({
      event: 'CHAT_FILES_ERASE_JOB_COMPLETED',
      totalMessages: messages.length,
      deletedCount,
      failedCount,
    });
  } catch (error) {
    logger.error({
      event: 'CHAT_FILES_ERASE_JOB_ERROR',
      error: error.message,
    });
  }
}

module.exports = {
  eraseFilesFromChat,
};
