-- Migration: Add file_url column to document_requests table
-- Description: Add file_url column to store Cloudflare R2 URLs for uploaded files

-- Add file_url column
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS file_url VARCHAR(500);

-- Add index for file_url lookups
CREATE INDEX IF NOT EXISTS idx_document_requests_file_url 
ON document_requests(file_url) 
WHERE file_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN document_requests.file_url IS 'Cloudflare R2 URL for uploaded file';
