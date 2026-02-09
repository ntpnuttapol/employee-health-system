-- ========================================
-- Employee Health & Activity System
-- Database Schema
-- ========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS employee_health_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE employee_health_system;

-- ========================================
-- Users Table (for login)
-- ========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'User') DEFAULT 'User',
    employee_id INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- Branches Table (สาขา)
-- ========================================
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- Departments Table (แผนก)
-- ========================================
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    branch_id INT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- ========================================
-- Positions Table (ตำแหน่ง)
-- ========================================
CREATE TABLE positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    level ENUM('บริหาร', 'ปฏิบัติการ', 'ฝึกงาน') DEFAULT 'ปฏิบัติการ',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- Employees Table (พนักงาน)
-- ========================================
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    branch_id INT,
    department_id INT,
    position_id INT,
    photo VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

-- Add foreign key to users table
ALTER TABLE users ADD CONSTRAINT fk_users_employee
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ========================================
-- Activities Table (กิจกรรม)
-- ========================================
CREATE TABLE activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(200),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- Activity Attendance (การเข้าร่วมกิจกรรม)
-- ========================================
CREATE TABLE activity_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL,
    employee_id INT NOT NULL,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_in_method ENUM('QR', 'Manual') DEFAULT 'QR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (activity_id, employee_id)
);

-- ========================================
-- Health Records (ข้อมูลสุขภาพ)
-- ========================================
CREATE TABLE health_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    blood_pressure_systolic INT COMMENT 'ความดันตัวบน (mmHg)',
    blood_pressure_diastolic INT COMMENT 'ความดันตัวล่าง (mmHg)',
    heart_rate INT COMMENT 'อัตราการเต้นหัวใจ (bpm)',
    blood_sugar DECIMAL(5,2) COMMENT 'น้ำตาลในเลือด (mg/dL)',
    weight DECIMAL(5,2) COMMENT 'น้ำหนัก (kg)',
    height DECIMAL(5,2) COMMENT 'ส่วนสูง (cm)',
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ========================================
-- Sample Data
-- ========================================

-- Insert default admin user (password: 1234)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin'),
('user', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'User');

-- Insert sample branches
INSERT INTO branches (name, address, phone) VALUES 
('สำนักงานใหญ่', '123 ถ.รัชดาภิเษก กรุงเทพฯ', '02-123-4567'),
('สาขาสุวรรณภูมิ', '456 ถ.บางนา-ตราด สมุทรปราการ', '02-765-4321'),
('สาขาระยอง', '789 ถ.สุขุมวิท ระยอง', '038-123-456');

-- Insert sample departments
INSERT INTO departments (name, branch_id) VALUES 
('ฝ่ายบุคคล', 1),
('ฝ่ายการเงิน', 1),
('ฝ่ายผลิต', 2),
('ฝ่ายคลังสินค้า', 2),
('ฝ่ายขาย', 3);

-- Insert sample positions
INSERT INTO positions (name, level) VALUES 
('ผู้จัดการ', 'บริหาร'),
('หัวหน้าแผนก', 'บริหาร'),
('พนักงานอาวุโส', 'ปฏิบัติการ'),
('พนักงาน', 'ปฏิบัติการ'),
('พนักงานฝึกงาน', 'ฝึกงาน');

-- Insert sample employees
INSERT INTO employees (employee_code, first_name, last_name, email, phone, branch_id, department_id, position_id) VALUES 
('EMP001', 'สมชาย', 'ใจดี', 'somchai@company.com', '081-234-5678', 1, 1, 2),
('EMP002', 'สมหญิง', 'รักงาน', 'somying@company.com', '082-345-6789', 1, 2, 4),
('EMP003', 'วิชัย', 'มานะ', 'wichai@company.com', '083-456-7890', 2, 3, 3),
('EMP004', 'มานี', 'มาก', 'manee@company.com', '084-567-8901', 3, 5, 4),
('EMP005', 'ประเสริฐ', 'ดีมาก', 'prasert@company.com', '085-678-9012', 2, 3, 4);

-- Insert sample activities
INSERT INTO activities (name, description, activity_date, start_time, end_time, location) VALUES 
('ตรวจสุขภาพประจำปี 2026', 'ตรวจสุขภาพประจำปีสำหรับพนักงานทุกคน', '2026-02-15', '09:00:00', '16:00:00', 'ห้องประชุมใหญ่'),
('อบรมความปลอดภัยในการทำงาน', 'อบรมความปลอดภัยตามกฎหมายแรงงาน', '2026-02-10', '13:00:00', '16:00:00', 'ห้องอบรม A'),
('กิจกรรมวันสถาปนาบริษัท', 'ครบรอบ 10 ปี บริษัท', '2026-03-01', '08:00:00', '17:00:00', 'โรงแรมแกรนด์');

-- Insert sample health records
INSERT INTO health_records (employee_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, weight, height, recorded_by) VALUES 
(1, 118, 78, 72, 95.0, 68.0, 172.0, 1),
(2, 125, 82, 68, 102.0, 55.0, 160.0, 1),
(3, 142, 92, 88, 130.0, 85.0, 175.0, 1),
(4, 115, 75, 65, 88.0, 52.0, 158.0, 1),
(5, 135, 88, 78, 110.0, 78.0, 170.0, 1);
