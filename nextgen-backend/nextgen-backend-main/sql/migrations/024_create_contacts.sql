-- 024_create_contacts.sql
-- Create contacts table for linking contacts to clients

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    client_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES xpm_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);