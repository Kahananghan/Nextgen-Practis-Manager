-- ============================================
-- Migration 014: Create xpm_jobs table
-- Description: Cached job data from XPM
-- ============================================

CREATE TABLE IF NOT EXISTS xpm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  xpm_job_id VARCHAR(255) NOT NULL,
  xpm_job_number VARCHAR(100),
  client_id UUID REFERENCES xpm_clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  job_type VARCHAR(100),
  category VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Planned' CHECK (state IN ('Planned', 'In Progress', 'On Hold', 'Complete')),
  priority VARCHAR(50) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Medium', 'High')),
  start_date DATE,
  due_date DATE,
  budget DECIMAL(10,2),
  assigned_staff_id UUID REFERENCES xpm_staff(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES xpm_staff(id) ON DELETE SET NULL,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  xpm_data JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, xpm_job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_tenant ON xpm_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_xpm_id ON xpm_jobs(xpm_job_id);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_client ON xpm_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_assigned_staff ON xpm_jobs(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_manager ON xpm_jobs(manager_id);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_state ON xpm_jobs(state);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_priority ON xpm_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_due_date ON xpm_jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_tenant_state ON xpm_jobs(tenant_id, state);
-- CREATE INDEX IF NOT EXISTS idx_xpm_jobs_overdue ON xpm_jobs(tenant_id, due_date, state)
--   WHERE due_date < CURRENT_DATE AND state != 'Complete';
CREATE INDEX IF NOT EXISTS idx_jobs_not_complete ON xpm_jobs(tenant_id, due_date)
WHERE state != 'Complete';
CREATE INDEX IF NOT EXISTS idx_xpm_jobs_sync ON xpm_jobs(last_synced_at);

-- Comments
COMMENT ON TABLE xpm_jobs IS 'Cached job data from Xero Practice Manager';
COMMENT ON COLUMN xpm_jobs.xpm_job_id IS 'Job ID from XPM API';
COMMENT ON COLUMN xpm_jobs.state IS 'Job state from XPM: Planned, In Progress, On Hold, Complete';
COMMENT ON COLUMN xpm_jobs.priority IS 'Local priority field (not from XPM)';
COMMENT ON COLUMN xpm_jobs.progress IS 'Calculated from completed tasks (0-100%)';
