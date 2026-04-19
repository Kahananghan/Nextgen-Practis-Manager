-- ============================================
-- Seed: Demo Tenant & User (Development Only)
-- Description: Create demo tenant and admin user
-- WARNING: Only run in development environment!
-- ============================================

-- Insert demo tenant
INSERT INTO tenants (id, name, domain, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Practice', 'demo.nextgen.local', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert demo admin user
-- Password: Demo123! (bcrypt hash with 10 rounds)
INSERT INTO users (id, tenant_id, email, password_hash, name, mobile, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@demo.nextgen.local',
    '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6', -- Demo123!
    'Demo Admin',
    '+61412345678',
    'active'
  )
ON CONFLICT (email) DO NOTHING;

-- Insert additional demo user: ka@abovestandard.dk
-- Password: Demo123! (bcrypt hash with 10 rounds)
INSERT INTO users (id, tenant_id, email, password_hash, name, mobile, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'ka@abovestandard.dk',
    '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6', -- Demo123!
    'Demo User KA',
    '+61412345679',
    'active'
  ),
   (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'kahan@gmail.com',
    '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6', -- Demo123!
    'Kahan',
    '+61412345680',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'kevin@gmail.com',
    '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6', -- Demo123!
    'Kevin',
    '+61412345681',
    'active'
  )
ON CONFLICT (email) DO NOTHING;

-- Assign demo tenant to Pro plan
INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, started_at, expires_at, auto_renew)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  true
FROM subscription_plans
WHERE tier = 'pro'
ON CONFLICT DO NOTHING;

-- Create default roles for demo tenant
INSERT INTO roles (tenant_id, name, description, is_system)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'Full system access', true),
  ('00000000-0000-0000-0000-000000000001', 'Manager', 'Manage jobs and users', true),
  ('00000000-0000-0000-0000-000000000001', 'Staff', 'View and edit assigned jobs', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Assign admin role to demo user
INSERT INTO user_roles (user_id, role_id)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id
FROM roles
WHERE tenant_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Grant full access permission to demo admin
INSERT INTO user_permissions (user_id, permission_id, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  true
FROM permissions
WHERE resource = 'full_access'
ON CONFLICT (user_id, permission_id) DO NOTHING;
