-- ============================================
-- Migration: Add Notifications Tables
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{
    "emailNotifications": true,
    "jobAssigned": true,
    "jobDueSoon": true,
    "jobOverdue": true,
    "jobCompleted": true,
    "mentions": true
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Sample notification for demo user
INSERT INTO notifications (user_id, type, title, message, data, is_read)
SELECT 
  u.id,
  'welcome',
  'Welcome to NextGen!',
  'Thank you for joining NextGen. Start by connecting your Xero Practice Manager account.',
  '{"action": "connect_xero"}',
  false
FROM users u
WHERE u.email = 'admin@demo.nextgen.local'
AND NOT EXISTS (
  SELECT 1 FROM notifications WHERE user_id = u.id AND type = 'welcome'
);
