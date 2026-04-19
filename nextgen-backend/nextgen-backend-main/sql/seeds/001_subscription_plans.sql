-- ============================================
-- Seed: Subscription Plans
-- Description: Insert default subscription plans
-- ============================================

INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, max_users, max_jobs_per_month, features, is_active)
VALUES
  (
    'Starter',
    'starter',
    49.00,
    490.00,
    5,
    100,
    '{
      "ai_chat": false,
      "advanced_reports": false,
      "custom_integrations": false,
      "priority_support": false,
      "bulk_operations": false,
      "api_access": false
    }'::jsonb,
    true
  ),
  (
    'Pro',
    'pro',
    149.00,
    1490.00,
    25,
    NULL,
    '{
      "ai_chat": true,
      "advanced_reports": true,
      "custom_integrations": false,
      "priority_support": true,
      "bulk_operations": true,
      "api_access": true
    }'::jsonb,
    true
  ),
  (
    'Enterprise',
    'enterprise',
    NULL,
    NULL,
    NULL,
    NULL,
    '{
      "ai_chat": true,
      "advanced_reports": true,
      "custom_integrations": true,
      "priority_support": true,
      "bulk_operations": true,
      "api_access": true,
      "white_label": true,
      "dedicated_account_manager": true
    }'::jsonb,
    true
  )
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_users = EXCLUDED.max_users,
  max_jobs_per_month = EXCLUDED.max_jobs_per_month,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
