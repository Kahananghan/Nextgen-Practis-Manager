-- ============================================
-- Migration 026: Create messages table (1:1 chat)
-- Description: Encrypted 1-to-1 messages between users
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT, -- AES-256 encrypted (base64 payload)
  file_url TEXT, -- stores R2 object key (e.g. chat-media/<uuid>-filename.ext)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversation index (supports sender/receiver queries)
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
  ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created_at
  ON messages(receiver_id, sender_id, created_at DESC);

COMMENT ON TABLE messages IS 'Encrypted 1-to-1 chat messages between users';
COMMENT ON COLUMN messages.message IS 'AES-256-GCM encrypted message payload (base64)';
COMMENT ON COLUMN messages.file_url IS 'R2 object key for attached media (presigned for access)';
