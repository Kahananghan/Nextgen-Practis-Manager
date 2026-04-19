-- ============================================
-- Migration 005: Create roles table
-- Description: Custom roles per tenant
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system);

-- Comments
COMMENT ON TABLE roles IS 'Custom roles per tenant';
COMMENT ON COLUMN roles.is_system IS 'System-defined role (cannot be deleted)';
COMMENT ON COLUMN roles.name IS 'Role name (unique per tenant)';
