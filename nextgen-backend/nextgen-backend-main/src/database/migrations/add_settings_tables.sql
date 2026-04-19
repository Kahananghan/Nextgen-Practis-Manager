-- ============================================
-- Migration: Add Settings Tables
-- ============================================

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "theme": "light",
    "language": "en",
    "timezone": "Australia/Sydney",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "emailNotifications": true,
    "desktopNotifications": true,
    "dashboardLayout": "default"
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- Tenant settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "companyName": "",
    "companyLogo": null,
    "businessHours": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "Australia/Sydney"
    },
    "defaultJobPriority": "Normal",
    "defaultJobState": "Planned",
    "fiscalYearStart": "07-01",
    "currency": "AUD",
    "taxRate": 10,
    "brandColor": "#1976D2",
    "features": {
      "templates": true,
      "reports": true,
      "aiChat": false
    }
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- Insert default settings for existing demo tenant
INSERT INTO tenant_settings (tenant_id, settings)
SELECT 
  t.id,
  '{
    "companyName": "Demo Accounting Practice",
    "companyLogo": null,
    "businessHours": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "Australia/Sydney"
    },
    "defaultJobPriority": "Normal",
    "defaultJobState": "Planned",
    "fiscalYearStart": "07-01",
    "currency": "AUD",
    "taxRate": 10,
    "brandColor": "#1976D2",
    "features": {
      "templates": true,
      "reports": true,
      "aiChat": false
    }
  }'
FROM tenants t
WHERE t.name = 'Demo Tenant'
AND NOT EXISTS (
  SELECT 1 FROM tenant_settings WHERE tenant_id = t.id
);
