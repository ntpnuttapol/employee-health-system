-- =====================================================
-- CUSTOM USERS TABLE FOR AUTHENTICATION
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS users;

-- Create users table with BIGINT for employee_id (matching employees.id)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'User' CHECK (role IN ('Admin', 'User')),
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for users table (internal use)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create default admin user
INSERT INTO users (username, password, full_name, role) VALUES
('admin', 'admin123', 'Administrator', 'Admin');

-- Create sample users
INSERT INTO users (username, password, full_name, role) VALUES
('user1', 'password123', 'ผู้ใช้งานทั่วไป 1', 'User'),
('user2', 'password123', 'ผู้ใช้งานทั่วไป 2', 'User');

-- Verify
SELECT id, username, full_name, role, is_active, created_at FROM users;
