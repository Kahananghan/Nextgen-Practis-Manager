-- ============================================
-- Migration: Create time_entries table
-- Description: Store time tracking entries for jobs
-- ============================================

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES xpm_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type VARCHAR(20) NOT NULL DEFAULT 'Billable' CHECK (type IN ('Billable', 'Non-billable')),
  is_timer_entry BOOLEAN DEFAULT false,
  timer_started_at TIMESTAMP,
  timer_stopped_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_date ON time_entries(tenant_id, entry_date);

-- Comments
COMMENT ON TABLE time_entries IS 'Time tracking entries for job tasks';
COMMENT ON COLUMN time_entries.duration_minutes IS 'Duration in minutes';
COMMENT ON COLUMN time_entries.type IS 'Billable or Non-billable time';
COMMENT ON COLUMN time_entries.is_timer_entry IS 'True if logged via timer, false if manual entry';
COMMENT ON COLUMN time_entries.is_completed IS 'Task completion status';
