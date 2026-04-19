// src/jobs/r2Utils.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Create and configure R2 client
 * @returns {S3Client} - Configured R2 client
 */
function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Extract object key from file URL
 * @param {string} fileUrl - Full file URL
 * @returns {string} - Object key for R2
 */
function extractObjectKey(fileUrl) {
  try {
    const urlParts = fileUrl.split('/');
    return urlParts.slice(-2).join('/'); // Get last 2 parts: chat-media/filename
  } catch (error) {
    throw new Error(`Invalid file URL format: ${fileUrl}`);
  }
}

/**
 * Delete file from Cloudflare R2
 * @param {string} fileUrl - Full file URL
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFileFromR2(fileUrl) {
  try {
    const r2Client = createR2Client();
    const objectKey = extractObjectKey(fileUrl);
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });

    await r2Client.send(deleteCommand);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createR2Client,
  extractObjectKey,
  deleteFileFromR2,
};
