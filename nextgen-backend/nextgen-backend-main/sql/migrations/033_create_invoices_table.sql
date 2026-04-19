-- ============================================
-- Migration: Create invoices table
-- ============================================
-- Created: 2025-01-06
-- Purpose: Store invoice data and tracking

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    terms TEXT,
    line_items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'synced', 'paid', 'overdue')),
    sent_via VARCHAR(20) CHECK (sent_via IN ('email', 'xero', 'pdf', 'manual')),
    xero_invoice_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger is only created if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_update_invoices_updated_at'
          AND tgrelid = 'invoices'::regclass
    ) THEN
        CREATE TRIGGER trigger_update_invoices_updated_at
            BEFORE UPDATE ON invoices
            FOR EACH ROW
            EXECUTE FUNCTION update_invoices_updated_at();
    END IF;
END;
$$;

-- Add comments
COMMENT ON TABLE invoices IS 'Stores invoice data and tracking information';
COMMENT ON COLUMN invoices.id IS 'Primary key UUID';
COMMENT ON COLUMN invoices.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number';
COMMENT ON COLUMN invoices.client_name IS 'Client company name';
COMMENT ON COLUMN invoices.client_email IS 'Client email address';
COMMENT ON COLUMN invoices.invoice_date IS 'Invoice issue date';
COMMENT ON COLUMN invoices.due_date IS 'Invoice due date';
COMMENT ON COLUMN invoices.terms IS 'Payment terms and conditions';
COMMENT ON COLUMN invoices.line_items IS 'JSON array of invoice line items';
COMMENT ON COLUMN invoices.subtotal IS 'Subtotal amount before tax';
COMMENT ON COLUMN invoices.tax IS 'Tax amount';
COMMENT ON COLUMN invoices.total IS 'Total amount including tax';
COMMENT ON COLUMN invoices.notes IS 'Additional notes for the invoice';
COMMENT ON COLUMN invoices.status IS 'Invoice status (draft, sent, synced, paid, overdue)';
COMMENT ON COLUMN invoices.sent_via IS 'How invoice was sent (email, xero, pdf, manual)';
COMMENT ON COLUMN invoices.xero_invoice_id IS 'Xero invoice ID if synced with Xero';
COMMENT ON COLUMN invoices.created_at IS 'Timestamp when invoice was created';
COMMENT ON COLUMN invoices.updated_at IS 'Timestamp when invoice was last updated';
