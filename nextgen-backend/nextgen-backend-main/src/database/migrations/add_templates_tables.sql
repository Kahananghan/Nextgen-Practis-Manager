-- ============================================
-- Migration: Add Templates Tables
-- ============================================

-- Job Templates table
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_templates_tenant ON job_templates(tenant_id);
CREATE INDEX idx_job_templates_category ON job_templates(category);

-- Task Templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_hours DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_templates_template ON task_templates(template_id);

-- Insert sample templates
INSERT INTO job_templates (tenant_id, name, description, category, is_public)
SELECT 
  t.id,
  'Annual Tax Return',
  'Standard annual tax return preparation',
  'Tax',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM job_templates WHERE name = 'Annual Tax Return' AND tenant_id = t.id
);

-- Insert sample tasks for Annual Tax Return template
INSERT INTO task_templates (template_id, name, description, estimated_hours, sort_order)
SELECT 
  jt.id,
  task_name,
  task_desc,
  task_hours,
  task_order
FROM job_templates jt
CROSS JOIN (
  VALUES 
    ('Request documents from client', 'Email client requesting financial documents', 0.5, 1),
    ('Review prior year return', 'Review previous year tax return for reference', 1.0, 2),
    ('Prepare draft return', 'Complete draft tax return', 4.0, 3),
    ('Review with manager', 'Manager review and approval', 1.0, 4),
    ('Client review', 'Send to client for review', 0.5, 5),
    ('Make revisions', 'Incorporate client feedback', 1.0, 6),
    ('Final review', 'Final check before lodgement', 0.5, 7),
    ('Lodge with ATO', 'Submit return to ATO', 0.5, 8),
    ('Confirmation to client', 'Send lodgement confirmation', 0.5, 9),
    ('File documentation', 'Archive all documents', 0.5, 10)
) AS t(task_name, task_desc, task_hours, task_order)
WHERE jt.name = 'Annual Tax Return'
AND NOT EXISTS (
  SELECT 1 FROM task_templates WHERE template_id = jt.id
);

-- Insert BAS template
INSERT INTO job_templates (tenant_id, name, description, category, is_public)
SELECT 
  t.id,
  'BAS Preparation',
  'Business Activity Statement preparation',
  'Compliance',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM job_templates WHERE name = 'BAS Preparation' AND tenant_id = t.id
);

-- Insert sample tasks for BAS template
INSERT INTO task_templates (template_id, name, description, estimated_hours, sort_order)
SELECT 
  jt.id,
  task_name,
  task_desc,
  task_hours,
  task_order
FROM job_templates jt
CROSS JOIN (
  VALUES 
    ('Reconcile accounts', 'Reconcile bank and credit card accounts', 2.0, 1),
    ('Review sales', 'Verify all sales invoices recorded', 1.0, 2),
    ('Review purchases', 'Verify all purchase invoices recorded', 1.0, 3),
    ('Calculate GST', 'Calculate GST payable/refundable', 1.0, 4),
    ('Prepare BAS', 'Complete BAS form', 1.5, 5),
    ('Review with client', 'Send BAS to client for approval', 0.5, 6),
    ('Lodge BAS', 'Submit BAS to ATO', 0.5, 7),
    ('Arrange payment', 'Coordinate payment if required', 0.5, 8)
) AS t(task_name, task_desc, task_hours, task_order)
WHERE jt.name = 'BAS Preparation'
AND NOT EXISTS (
  SELECT 1 FROM task_templates WHERE template_id = jt.id
);
