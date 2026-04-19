-- ============================================
-- Migration 001: Create tenants table
-- Description: Multi-tenant root entity
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- Comments
COMMENT ON TABLE tenants IS 'Multi-tenant organizations (accounting practices)';
COMMENT ON COLUMN tenants.id IS 'Unique tenant identifier';
COMMENT ON COLUMN tenants.name IS 'Tenant/practice name';
COMMENT ON COLUMN tenants.domain IS 'Custom domain (optional)';
COMMENT ON COLUMN tenants.status IS 'Tenant status: active, inactive, suspended';
