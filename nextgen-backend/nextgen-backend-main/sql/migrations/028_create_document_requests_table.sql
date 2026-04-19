-- ============================================
-- Migration: Create document_requests table
-- ============================================

-- Create document_requests table
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_id UUID REFERENCES xpm_jobs(id) ON DELETE CASCADE,
    client_id UUID REFERENCES xpm_clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    reminder_settings VARCHAR(20) DEFAULT '3days' CHECK (reminder_settings IN ('none', '1day', '3days', '7days', 'daily')),
    file_types JSONB DEFAULT '{"pdf": true, "excel": true, "csv": true, "word": true, "image": true, "any": true}',
    notify_client BOOLEAN DEFAULT true,
    assigned_staff_id UUID REFERENCES xpm_staff(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'overdue', 'cancelled')),
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP,
    file_name VARCHAR(255),
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_requests_tenant_id ON document_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_job_id ON document_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_client_id ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_due_date ON document_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON document_requests(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_document_requests_tenant_job_status ON document_requests(tenant_id, job_id, status);

-- Add RLS (Row Level Security) policies
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'document_requests_updated_at_trigger'
    ) THEN
        CREATE TRIGGER document_requests_updated_at_trigger
            BEFORE UPDATE ON document_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_document_requests_updated_at();
    END IF;
END$$;

-- Add comments for documentation
COMMENT ON TABLE document_requests IS 'Table to store document requests for jobs and clients';
COMMENT ON COLUMN document_requests.id IS 'Unique identifier for the document request';
COMMENT ON COLUMN document_requests.tenant_id IS 'Tenant identifier for multi-tenancy';
COMMENT ON COLUMN document_requests.job_id IS 'Reference to the job this request belongs to';
COMMENT ON COLUMN document_requests.client_id IS 'Reference to the client this request belongs to';
COMMENT ON COLUMN document_requests.name IS 'Name of the document request';
COMMENT ON COLUMN document_requests.description IS 'Detailed description of what document is needed';
COMMENT ON COLUMN document_requests.due_date IS 'Due date for the document request';
COMMENT ON COLUMN document_requests.priority IS 'Priority level of the request';
COMMENT ON COLUMN document_requests.reminder_settings IS 'When to send reminders';
COMMENT ON COLUMN document_requests.file_types IS 'JSON object specifying accepted file types';
COMMENT ON COLUMN document_requests.notify_client IS 'Whether to send email notification to client';
COMMENT ON COLUMN document_requests.assigned_staff_id IS 'Staff member assigned to this request';
COMMENT ON COLUMN document_requests.status IS 'Current status of the document request';
COMMENT ON COLUMN document_requests.reminder_count IS 'Number of reminders sent';
COMMENT ON COLUMN document_requests.last_reminder_sent IS 'Timestamp of last reminder sent';
COMMENT ON COLUMN document_requests.file_name IS 'Name of uploaded file';
COMMENT ON COLUMN document_requests.uploaded_at IS 'Timestamp when file was uploaded';
COMMENT ON COLUMN document_requests.created_at IS 'Timestamp when the request was created';
COMMENT ON COLUMN document_requests.updated_at IS 'Timestamp when the request was last updated';
