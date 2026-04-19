-- ============================================
-- Migration 015: Create xpm_tasks table
-- Description: Cached task data from XPM
-- ============================================

CREATE TABLE IF NOT EXISTS xpm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES xpm_jobs(id) ON DELETE CASCADE,
  xpm_task_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  sort_order INT DEFAULT 0,
  xpm_data JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, xpm_task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_tenant ON xpm_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_job ON xpm_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_xpm_id ON xpm_tasks(xpm_task_id);
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_completed ON xpm_tasks(job_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_sort ON xpm_tasks(job_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_xpm_tasks_sync ON xpm_tasks(last_synced_at);

-- Comments
COMMENT ON TABLE xpm_tasks IS 'Cached task data from Xero Practice Manager';
COMMENT ON COLUMN xpm_tasks.xpm_task_id IS 'Task ID from XPM API';
COMMENT ON COLUMN xpm_tasks.sort_order IS 'Display order within job';
