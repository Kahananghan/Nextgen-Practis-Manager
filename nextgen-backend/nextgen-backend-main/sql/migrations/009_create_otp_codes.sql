-- ============================================
-- Migration 009: Create otp_codes table
-- Description: One-time passwords for email verification
-- ============================================

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'password_reset' CHECK (purpose IN ('password_reset', 'email_verification')),
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_active ON otp_codes(email, is_used, expires_at) 
  WHERE is_used = false;

-- Comments
COMMENT ON TABLE otp_codes IS 'One-time password codes for verification';
COMMENT ON COLUMN otp_codes.code IS '4-digit verification code';
COMMENT ON COLUMN otp_codes.purpose IS 'OTP purpose: password_reset, email_verification';
COMMENT ON COLUMN otp_codes.expires_at IS 'Expiry timestamp (typically 10 minutes)';
