-- ============================================
-- Migration: Add Portal Links to Document Requests
-- Portal links auto-expire after document due date
-- ============================================

-- Add portal link fields to document_requests table
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS portal_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS portal_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS portal_is_active BOOLEAN DEFAULT true;

-- Create unique index for portal tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_requests_portal_token 
ON document_requests(portal_token) 
WHERE portal_token IS NOT NULL;

-- Create index for portal expiration queries
CREATE INDEX IF NOT EXISTS idx_document_requests_portal_expires 
ON document_requests(portal_expires_at) 
WHERE portal_is_active = true;

-- Create function to auto-deactivate expired portal links
CREATE OR REPLACE FUNCTION deactivate_expired_portal_links()
RETURNS void AS $$
BEGIN
  UPDATE document_requests
  SET portal_is_active = false
  WHERE portal_is_active = true
    AND portal_expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN document_requests.portal_token IS 'Unique token for client portal access';
COMMENT ON COLUMN document_requests.portal_url IS 'Full URL for client portal access';
COMMENT ON COLUMN document_requests.portal_expires_at IS 'Portal link expiration timestamp (typically document due date)';
COMMENT ON COLUMN document_requests.portal_is_active IS 'Whether the portal link is currently active';
