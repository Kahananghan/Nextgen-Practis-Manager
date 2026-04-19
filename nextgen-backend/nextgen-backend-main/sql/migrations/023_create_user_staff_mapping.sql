-- ============================================
-- Migration 023: Create user_staff_mapping table
-- Description: Maps NextGen users to XPM staff members
-- ============================================

CREATE TABLE IF NOT EXISTS user_staff_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xpm_staff_id UUID NOT NULL REFERENCES xpm_staff(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(xpm_staff_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_staff_mapping_user ON user_staff_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_staff_mapping_staff ON user_staff_mapping(xpm_staff_id);

-- Comments
COMMENT ON TABLE user_staff_mapping IS 'Maps NextGen users to XPM staff for job assignments';
COMMENT ON COLUMN user_staff_mapping.user_id IS 'NextGen application user';
COMMENT ON COLUMN user_staff_mapping.xpm_staff_id IS 'Corresponding XPM staff member';
