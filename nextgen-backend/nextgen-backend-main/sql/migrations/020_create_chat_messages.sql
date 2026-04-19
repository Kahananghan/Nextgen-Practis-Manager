-- ============================================
-- Migration 020: Create chat_messages table
-- Description: Internal messaging between users (local only)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_from ON chat_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_to ON chat_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(to_user_id, is_read) 
  WHERE is_read = false;

-- Comments
COMMENT ON TABLE chat_messages IS 'Internal messaging between users (local feature)';
COMMENT ON COLUMN chat_messages.is_read IS 'Message has been read by recipient';
