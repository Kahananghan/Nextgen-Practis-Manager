-- ============================================
-- Migration 019: Create favourite_clients table
-- Description: User's starred/favourite clients (local only)
-- ============================================

CREATE TABLE IF NOT EXISTS favourite_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES xpm_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favourite_clients_user ON favourite_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_favourite_clients_client ON favourite_clients(client_id);

-- Comments
COMMENT ON TABLE favourite_clients IS 'User starred/favourite clients (local feature)';
