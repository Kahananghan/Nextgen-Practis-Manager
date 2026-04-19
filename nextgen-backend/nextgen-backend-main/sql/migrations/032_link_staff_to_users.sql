-- ============================================
-- Migration: Link xpm_staff to users for login
-- Description: Creates user accounts for xpm_staff members
-- ============================================

-- Create users for existing xpm_staff who have email and no user account yet
INSERT INTO users (id, tenant_id, email, password_hash, name, mobile, status)
SELECT 
  gen_random_uuid(),
  xs.tenant_id,
  xs.email,
  '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6', -- Default: Demo123!
  xs.name,
  xs.phone,
  CASE WHEN xs.is_active THEN 'active' ELSE 'inactive' END
FROM xpm_staff xs
WHERE xs.email IS NOT NULL
  AND xs.email NOT IN (SELECT email FROM users WHERE email IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Create mapping between users and xpm_staff
INSERT INTO user_staff_mapping (user_id, xpm_staff_id)
SELECT u.id, xs.id
FROM users u
JOIN xpm_staff xs ON u.email = xs.email
WHERE u.id NOT IN (SELECT user_id FROM user_staff_mapping)
  AND xs.id NOT IN (SELECT xpm_staff_id FROM user_staff_mapping)
ON CONFLICT DO NOTHING;

-- Assign role from xpm_staff.role if it exists in roles table, otherwise default to 'Staff'
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN xpm_staff xs ON u.email = xs.email
JOIN roles r ON r.tenant_id = u.tenant_id 
  AND r.name = COALESCE(
    (SELECT name FROM roles WHERE tenant_id = u.tenant_id AND name = xs.role),
    'Staff'
  )
WHERE u.id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION create_user_for_staff()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  staff_role_id UUID;
  default_password VARCHAR := '$2b$10$VIBeNnFPAWnkftv0XZF0yemSBmYffPGBpaP671i9cQSJi6Oc73Lz6';
BEGIN
  -- Only proceed if email is set and not already linked
  IF NEW.email IS NOT NULL THEN
    
    -- Check if user already exists with this email
    SELECT id INTO new_user_id 
    FROM users 
    WHERE email = NEW.email;
    
    IF new_user_id IS NULL THEN
      -- Create new user
      new_user_id := gen_random_uuid();
      
      INSERT INTO users (id, tenant_id, email, password_hash, name, mobile, status)
      VALUES (
        new_user_id,
        NEW.tenant_id,
        NEW.email,
        default_password,
        NEW.name,
        NEW.phone,
        CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END
      );
      
      -- Create mapping
      INSERT INTO user_staff_mapping (user_id, xpm_staff_id)
      VALUES (new_user_id, NEW.id)
      ON CONFLICT DO NOTHING;
      
      -- Assign role from xpm_staff.role if it exists in roles table, otherwise default to 'Staff'
      SELECT id INTO staff_role_id
      FROM roles
      WHERE tenant_id = NEW.tenant_id 
        AND name = COALESCE(
          (SELECT name FROM roles WHERE tenant_id = NEW.tenant_id AND name = NEW.role),
          'Staff'
        );
      
      IF staff_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (new_user_id, staff_role_id)
        ON CONFLICT DO NOTHING;
      END IF;
      
    ELSE
      -- User exists, just create mapping if not exists
      INSERT INTO user_staff_mapping (user_id, xpm_staff_id)
      VALUES (new_user_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_create_user_for_staff ON xpm_staff;

-- Create trigger to run after insert or update of email
CREATE TRIGGER trg_create_user_for_staff
AFTER INSERT OR UPDATE OF email ON xpm_staff
FOR EACH ROW
EXECUTE FUNCTION create_user_for_staff();

COMMENT ON FUNCTION create_user_for_staff() IS 'Auto-creates user account and assigns role from xpm_staff.role (or Staff as default) when staff email is added/updated';
