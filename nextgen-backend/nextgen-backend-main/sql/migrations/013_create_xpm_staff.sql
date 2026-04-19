-- ============================================
-- Migration 013: Create xpm_staff table
-- Description: Cached staff data from XPM
-- ============================================

CREATE TABLE IF NOT EXISTS xpm_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  xpm_staff_id VARCHAR(255) NOT NULL,
  xpm_uuid VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(100),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  xpm_data JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, xpm_staff_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xpm_staff_tenant ON xpm_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xpm_staff_xpm_id ON xpm_staff(xpm_staff_id);
CREATE INDEX IF NOT EXISTS idx_xpm_staff_active ON xpm_staff(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_xpm_staff_sync ON xpm_staff(last_synced_at);

-- Comments
COMMENT ON TABLE xpm_staff IS 'Cached staff data from Xero Practice Manager';
COMMENT ON COLUMN xpm_staff.xpm_staff_id IS 'Staff ID from XPM API';
COMMENT ON COLUMN xpm_staff.xpm_data IS 'Full XPM API response payload';
