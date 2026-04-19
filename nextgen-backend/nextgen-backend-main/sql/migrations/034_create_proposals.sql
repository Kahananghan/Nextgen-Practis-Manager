-- ============================================
-- Migration 034: Create proposals tables
-- Description: Create tables for proposal management system
-- ============================================

-- Auto-update function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Main proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Client information
    client_id UUID REFERENCES xpm_clients(id),
    client_name VARCHAR(255), -- For prospect clients
    client_email VARCHAR(255),
    contact_name VARCHAR(255),
    
    -- Proposal content
    cover_message TEXT,
    
    -- Financial information
    total_value DECIMAL(12,2),
    subtotal DECIMAL(12,2),
    gst_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'AUD',
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn')),
    
    -- Timestamps
    sent_date TIMESTAMP,
    viewed_date TIMESTAMP,
    signed_date TIMESTAMP,
    accepted_date TIMESTAMP,
    declined_date TIMESTAMP,
    expiry_date TIMESTAMP,
    terms_agreed_at TIMESTAMP,
    
    -- Analytics
    open_count INTEGER DEFAULT 0,
    last_opened_at TIMESTAMP,
    
    -- View token (more secure than URL)
    view_token UUID UNIQUE DEFAULT gen_random_uuid(),
    
    -- Signature data (using file path instead of base64)
    signature_data JSONB, -- {type: 'draw', file: '/signatures/proposal_123.png', name: 'John Smith', ip_address: 'xxx', user_agent: 'xxx', signed_at: 'timestamp'}
    
    -- Settings
    auto_reminder_days INTEGER DEFAULT 3,
    last_reminder_sent TIMESTAMP,

    -- References
    created_by UUID REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Proposal content table (JSONB approach)
CREATE TABLE IF NOT EXISTS proposal_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    
    -- Service lines as JSONB array
    service_lines JSONB DEFAULT '[]', -- [{service: "Tax Return", type: "Fixed", quantity: 1, rate: 1800, total: 1800, description: "..."}]
    
    -- Billing settings as JSONB
    billing_settings JSONB DEFAULT '{}', -- {has_recurring: true, cycle: "Monthly", amount: 1078, start_date: "2025-01-01", ...}
    
    -- Documents as JSONB
    documents JSONB DEFAULT '{}', -- {engagement_letter: {content: "...", html: "..."}, terms_conditions: {content: "..."}}
    
    -- Activity log as JSONB array
    activity_log JSONB DEFAULT '[]', -- [{type: "sent", description: "Sent to client", created_at: "2025-01-01T00:00:00Z", metadata: {}}]
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for proposals table
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_view_token ON proposals(view_token);
CREATE INDEX IF NOT EXISTS idx_proposals_expiry ON proposals(expiry_date) WHERE expiry_date IS NOT NULL;

-- Index for expiry job support
CREATE INDEX IF NOT EXISTS idx_proposals_expiring 
ON proposals (tenant_id, expiry_date) 
WHERE status = 'sent';

-- Index for reminder job support
CREATE INDEX IF NOT EXISTS idx_proposals_last_reminder_sent 
ON proposals (last_reminder_sent) 
WHERE last_reminder_sent IS NOT NULL;

-- Auto-update triggers
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_content_updated_at
BEFORE UPDATE ON proposal_content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- JSONB Indexes for proposal_content
CREATE INDEX IF NOT EXISTS idx_proposal_content_service_lines ON proposal_content USING GIN (service_lines);
CREATE INDEX IF NOT EXISTS idx_proposal_content_activity_log ON proposal_content USING GIN (activity_log);
CREATE INDEX IF NOT EXISTS idx_proposal_content_billing_settings ON proposal_content USING GIN (billing_settings);

-- Unique constraint for proposal_content
ALTER TABLE proposal_content ADD CONSTRAINT unique_proposal_content UNIQUE (proposal_id);

-- Comments
COMMENT ON TABLE proposals IS 'Main proposal records';
COMMENT ON COLUMN proposals.signature_data IS 'Signature information including type, data, and metadata';
COMMENT ON COLUMN proposals.view_token IS 'Unique UUID token for client-facing proposal access';
COMMENT ON COLUMN proposals.last_reminder_sent IS 'Timestamp when last automatic reminder was sent';
COMMENT ON TABLE proposal_content IS 'Proposal content stored as JSONB for flexibility';
COMMENT ON COLUMN proposal_content.service_lines IS 'Array of service line items with pricing';
COMMENT ON COLUMN proposal_content.billing_settings IS 'Billing configuration including recurring settings';
COMMENT ON COLUMN proposal_content.documents IS 'Document content for engagement letters and terms';
COMMENT ON COLUMN proposal_content.activity_log IS 'Activity history for audit trail';
