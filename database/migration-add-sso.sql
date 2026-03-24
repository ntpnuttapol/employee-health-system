-- Migration: Add Hub SSO support to Hr Employee system
-- Run this in Supabase SQL Editor

-- 1. Add hub_user_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hub_user_id UUID UNIQUE;

-- 2. Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_users_hub_user_id ON users(hub_user_id);

-- 3. Update existing users to link with Hub accounts
-- ตัวอย่าง: ผู้ใช้ที่มี username 'admin' จะเชื่อมกับ Hub user ที่มี email 'admin@pfs.co.th'
-- UPDATE users SET hub_user_id = 'uuid-from-hub' WHERE username = 'admin';

-- 4. Optional: Add a function to auto-link users by email
-- ถ้า Hub email ตรงกับ local email ให้อัปเดต hub_user_id อัตโนมัติ

-- 5. Create view for user management
CREATE OR REPLACE VIEW user_hub_mapping AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.hub_user_id,
  u.full_name,
  u.role,
  u.is_active,
  e.first_name || ' ' || e.last_name as employee_name,
  d.name as department_name
FROM users u
LEFT JOIN employees e ON u.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

-- 6. Query to find users without Hub mapping (for admin to review)
-- SELECT * FROM users WHERE hub_user_id IS NULL AND is_active = true;

-- Note: After running this migration, you'll need to:
-- 1. Update HUB_VALIDATE_URL in LoginPage.jsx to point to your Hub
-- 2. Manually link existing users or wait for auto-link on first SSO login
-- 3. Update Hub's SSOPortalGrid to set requiresSso: true for hr-employee
