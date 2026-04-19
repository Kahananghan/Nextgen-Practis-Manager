-- ============================================
-- Migration 016: Create xpm_categories table
-- Description: Cached job categories from XPM
-- ============================================

CREATE TABLE IF NOT EXISTS xpm_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  xpm_category_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  xpm_data JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, xpm_category_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xpm_categories_tenant ON xpm_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xpm_categories_xpm_id ON xpm_categories(xpm_category_id);
CREATE INDEX IF NOT EXISTS idx_xpm_categories_sync ON xpm_categories(last_synced_at);

-- Comments
COMMENT ON TABLE xpm_categories IS 'Cached job categories from Xero Practice Manager';
COMMENT ON COLUMN xpm_categories.xpm_category_id IS 'Category ID from XPM API';
