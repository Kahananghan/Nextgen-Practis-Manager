-- ============================================
-- Migration 004: Create tenant_subscriptions table
-- Description: Active subscriptions for tenants
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_active ON tenant_subscriptions(tenant_id, status) 
  WHERE status = 'active';

-- Comments
COMMENT ON TABLE tenant_subscriptions IS 'Active subscriptions per tenant';
COMMENT ON COLUMN tenant_subscriptions.status IS 'Subscription status: active, expired, cancelled';
COMMENT ON COLUMN tenant_subscriptions.expires_at IS 'Expiry date (NULL = no expiry)';
COMMENT ON COLUMN tenant_subscriptions.auto_renew IS 'Auto-renew on expiry';
