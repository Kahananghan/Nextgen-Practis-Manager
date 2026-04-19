-- ============================================
-- Migration 006: Create permissions table
-- Description: Permission definitions (resource x action)
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Comments
COMMENT ON TABLE permissions IS 'Permission definitions (resource x action matrix)';
COMMENT ON COLUMN permissions.resource IS 'Resource name (e.g., jobs, users, templates)';
COMMENT ON COLUMN permissions.action IS 'Action name (e.g., create, view, edit, delete)';

-- Insert default permissions
INSERT INTO permissions (resource, action, description) VALUES
  -- Full Access
  ('full_access', 'all', 'Full access to all resources'),
  
  -- Jobs
  ('jobs', 'create', 'Create new jobs'),
  ('jobs', 'view', 'View jobs'),
  ('jobs', 'edit', 'Edit jobs'),
  ('jobs', 'delete', 'Delete jobs'),
  
  -- Reports
  ('reports', 'create', 'Create reports'),
  ('reports', 'view', 'View reports'),
  ('reports', 'edit', 'Edit reports'),
  
  -- Users
  ('users', 'create', 'Create users'),
  ('users', 'view', 'View users'),
  ('users', 'edit', 'Edit users'),
  ('users', 'delete', 'Delete users'),
  
  -- Templates
  ('templates', 'create', 'Create templates'),
  ('templates', 'view', 'View templates'),
  ('templates', 'edit', 'Edit templates'),
  ('templates', 'delete', 'Delete templates'),
  
  -- Clients
  ('clients', 'view', 'View clients'),
  
  -- Settings
  ('settings', 'manage', 'Manage settings')
ON CONFLICT (resource, action) DO NOTHING;
