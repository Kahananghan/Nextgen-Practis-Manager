-- ============================================
-- Migration 012: Create xpm_clients table
-- Description: Cached client data from Xero Practice Manager
-- ============================================

CREATE TABLE IF NOT EXISTS xpm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  xpm_client_id VARCHAR(255) NOT NULL,
  xpm_uuid VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,
  is_archived BOOLEAN DEFAULT false,
  xpm_data JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, xpm_client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xpm_clients_tenant ON xpm_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xpm_clients_xpm_id ON xpm_clients(xpm_client_id);
CREATE INDEX IF NOT EXISTS idx_xpm_clients_name ON xpm_clients(name);
CREATE INDEX IF NOT EXISTS idx_xpm_clients_archived ON xpm_clients(tenant_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_xpm_clients_sync ON xpm_clients(last_synced_at);

-- Comments
COMMENT ON TABLE xpm_clients IS 'Cached client data from Xero Practice Manager';
COMMENT ON COLUMN xpm_clients.xpm_client_id IS 'Client ID from XPM API';
COMMENT ON COLUMN xpm_clients.xpm_uuid IS 'Client UUID from XPM';
COMMENT ON COLUMN xpm_clients.xpm_data IS 'Full XPM API response payload';
COMMENT ON COLUMN xpm_clients.last_synced_at IS 'Last sync timestamp from XPM';
