-- ============================================
-- Migration 018: Create template_tasks table
-- Description: Tasks within templates
-- ============================================

CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_sort ON template_tasks(template_id, sort_order);

-- Comments
COMMENT ON TABLE template_tasks IS 'Tasks within job templates';
COMMENT ON COLUMN template_tasks.sort_order IS 'Display order within template';
