-- ============================================
-- Migration 003: Create subscription_plans table
-- Description: Available subscription tiers
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL UNIQUE CHECK (tier IN ('starter', 'pro', 'enterprise')),
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_users INT,
  max_jobs_per_month INT,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Comments
COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions';
COMMENT ON COLUMN subscription_plans.tier IS 'Plan tier: starter, pro, enterprise';
COMMENT ON COLUMN subscription_plans.max_users IS 'Maximum users allowed (NULL = unlimited)';
COMMENT ON COLUMN subscription_plans.max_jobs_per_month IS 'Maximum jobs per month (NULL = unlimited)';
COMMENT ON COLUMN subscription_plans.features IS 'JSON object of enabled features';
