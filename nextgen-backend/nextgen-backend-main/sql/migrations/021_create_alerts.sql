-- ============================================
-- Migration 021: Create alerts table
-- Description: System-generated alerts/notifications
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES xpm_jobs(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL CHECK (type IN ('overdue', 'due_soon', 'completed', 'assigned', 'system')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_job ON alerts(job_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(user_id, is_read) 
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Comments
COMMENT ON TABLE alerts IS 'System-generated alerts and notifications';
COMMENT ON COLUMN alerts.type IS 'Alert type: overdue, due_soon, completed, assigned, system';
COMMENT ON COLUMN alerts.user_id IS 'Target user (NULL = all users in tenant)';
