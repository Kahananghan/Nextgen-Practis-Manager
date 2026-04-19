-- ============================================
-- Migration: Create Job Recurrence System
-- ============================================

-- Create job_recurrence_patterns table
CREATE TABLE IF NOT EXISTS job_recurrence_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES xpm_jobs(id) ON DELETE CASCADE,
  
  -- Recurrence configuration
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'biannual', 'yearly')),
  interval_days_before_due INTEGER NOT NULL DEFAULT 5 CHECK (interval_days_before_due >= 1 AND interval_days_before_due <= 30),
  
  -- Assignment options
  auto_assign_to_same_staff BOOLEAN NOT NULL DEFAULT true,
  require_review_before_completion BOOLEAN NOT NULL DEFAULT false,
  use_same_template_tasks BOOLEAN NOT NULL DEFAULT true,
  
  -- Notification settings
  notify_assignee_on_creation BOOLEAN NOT NULL DEFAULT true,
  notify_manager_on_creation BOOLEAN NOT NULL DEFAULT false,
  
  -- Status and scheduling
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_creation_date DATE,
  last_created_job_id UUID REFERENCES xpm_jobs(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_active_recurrence_per_job UNIQUE (job_id) DEFERRABLE INITIALLY DEFERRED
);

-- Create job_recurrence_instances table to track created jobs
CREATE TABLE IF NOT EXISTS job_recurrence_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_pattern_id UUID NOT NULL REFERENCES job_recurrence_patterns(id) ON DELETE CASCADE,
  created_job_id UUID NOT NULL REFERENCES xpm_jobs(id) ON DELETE CASCADE,
  original_job_id UUID NOT NULL REFERENCES xpm_jobs(id),
  
  -- Instance details
  scheduled_creation_date DATE NOT NULL,
  actual_creation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  due_date DATE NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'cancelled', 'failed')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_recurrence_patterns_tenant_job ON job_recurrence_patterns(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS idx_job_recurrence_patterns_active ON job_recurrence_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_recurrence_patterns_next_creation ON job_recurrence_patterns(next_creation_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_recurrence_instances_pattern ON job_recurrence_instances(recurrence_pattern_id);
CREATE INDEX IF NOT EXISTS idx_job_recurrence_instances_status ON job_recurrence_instances(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurrence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_job_recurrence_patterns_updated_at') THEN
    CREATE TRIGGER trigger_job_recurrence_patterns_updated_at
      BEFORE UPDATE ON job_recurrence_patterns
      FOR EACH ROW
      EXECUTE FUNCTION update_recurrence_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_job_recurrence_instances_updated_at') THEN
    CREATE TRIGGER trigger_job_recurrence_instances_updated_at
      BEFORE UPDATE ON job_recurrence_instances
      FOR EACH ROW
      EXECUTE FUNCTION update_recurrence_updated_at();
  END IF;
END$$;

-- Add comments for documentation
COMMENT ON TABLE job_recurrence_patterns IS 'Defines recurring job patterns and their configuration';
COMMENT ON TABLE job_recurrence_instances IS 'Tracks individual instances of recurring jobs';
