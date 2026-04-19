-- ============================================
-- Migration 022: Create sync_logs table
-- Description: XPM sync operation logs
-- ============================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sync_type VARCHAR(100) NOT NULL CHECK (sync_type IN ('full', 'delta')),
  entity VARCHAR(100) NOT NULL CHECK (entity IN ('clients', 'jobs', 'tasks', 'staff', 'categories', 'all')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  records_synced INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);

-- Comments
COMMENT ON TABLE sync_logs IS 'XPM sync operation logs for monitoring';
COMMENT ON COLUMN sync_logs.sync_type IS 'Sync type: full (complete), delta (incremental)';
COMMENT ON COLUMN sync_logs.entity IS 'Entity synced: clients, jobs, tasks, staff, categories, all';
COMMENT ON COLUMN sync_logs.duration_ms IS 'Sync duration in milliseconds';
