-- ============================================
-- Migration 010: Create integrations table
-- Description: Third-party integration status
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL CHECK (provider IN ('xero', 'microsoft_teams', 'amazon')),
  status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- Comments
COMMENT ON TABLE integrations IS 'Third-party integration connections';
COMMENT ON COLUMN integrations.provider IS 'Integration provider: xero, microsoft_teams, amazon';
COMMENT ON COLUMN integrations.status IS 'Connection status: connected, disconnected, error';
COMMENT ON COLUMN integrations.config IS 'Provider-specific configuration';
