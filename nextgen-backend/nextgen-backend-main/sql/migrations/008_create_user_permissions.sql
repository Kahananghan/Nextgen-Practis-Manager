-- ============================================
-- Migration 008: Create user_permissions table
-- Description: Direct user permission assignments
-- ============================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, is_active) 
  WHERE is_active = true;

-- Comments
COMMENT ON TABLE user_permissions IS 'Direct permission assignments to users';
COMMENT ON COLUMN user_permissions.is_active IS 'Permission is currently active';
