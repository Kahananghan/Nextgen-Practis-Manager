-- ============================================
-- Migration 011: Create xero_tokens table
-- Description: Encrypted Xero OAuth tokens
-- ============================================

CREATE TABLE IF NOT EXISTS xero_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  xpm_tenant_id VARCHAR(255),
  xpm_tenant_name VARCHAR(255),
  xpm_tenant_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xero_tokens_user ON xero_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_xero_tokens_tenant ON xero_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_tokens_expires ON xero_tokens(expires_at);

-- Comments
COMMENT ON TABLE xero_tokens IS 'Encrypted Xero OAuth2 tokens';
COMMENT ON COLUMN xero_tokens.access_token IS 'Encrypted access token (AES-256-GCM)';
COMMENT ON COLUMN xero_tokens.refresh_token IS 'Encrypted refresh token (AES-256-GCM)';
COMMENT ON COLUMN xero_tokens.id_token IS 'Encrypted ID token (AES-256-GCM)';
COMMENT ON COLUMN xero_tokens.xpm_tenant_id IS 'Xero Practice Manager tenant ID';
