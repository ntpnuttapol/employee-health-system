-- ========================================
-- 5S Score Edit Windows (เปิด-ปิดสิทธิ์แก้ไขคะแนน)
-- ========================================
-- Admin กดเปิดสิทธิ์ → เริ่มนับ 24 ชม. → หมดเวลาอัตโนมัติ

CREATE TABLE IF NOT EXISTS five_s_edit_windows (
    id BIGSERIAL PRIMARY KEY,
    inspection_date DATE NOT NULL,
    opened_by BIGINT NOT NULL,           -- user_id ของ Admin ที่เปิดสิทธิ์
    opened_at TIMESTAMPTZ DEFAULT NOW(), -- เวลาที่เปิดสิทธิ์
    expires_at TIMESTAMPTZ NOT NULL,     -- หมดเวลาเมื่อไหร่ (opened_at + 1 day)
    is_active BOOLEAN DEFAULT TRUE,      -- ยังเปิดอยู่หรือไม่
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_five_s_edit_windows_date ON five_s_edit_windows(inspection_date);
CREATE INDEX idx_five_s_edit_windows_active ON five_s_edit_windows(is_active, expires_at);

-- ========================================
-- 5S Edit Log (บันทึกประวัติการแก้ไข)
-- ========================================
CREATE TABLE IF NOT EXISTS five_s_edit_log (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL,       -- รายการตรวจที่ถูกแก้ไข
    edited_by BIGINT NOT NULL,           -- user_id ที่ทำการแก้ไข
    edited_at TIMESTAMPTZ DEFAULT NOW(),
    field_changed TEXT NOT NULL,          -- ชื่อฟิลด์ที่เปลี่ยน
    old_value TEXT,                       -- ค่าเดิม
    new_value TEXT,                       -- ค่าใหม่
    edit_type TEXT DEFAULT 'score_edit'   -- 'score_edit', 'admin_override', 'delete'
);

CREATE INDEX idx_five_s_edit_log_inspection ON five_s_edit_log(inspection_id);
CREATE INDEX idx_five_s_edit_log_edited_by ON five_s_edit_log(edited_by);

-- ========================================
-- RLS Policies (Row Level Security)
-- ========================================

-- Edit Windows: ทุกคนอ่านได้ แต่ Admin เท่านั้นที่สร้าง/แก้ได้
ALTER TABLE five_s_edit_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read edit windows"
ON five_s_edit_windows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage edit windows"
ON five_s_edit_windows FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Edit Log: ทุกคนอ่านได้ แต่ระบบเท่านั้นที่ insert ได้
ALTER TABLE five_s_edit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read edit logs"
ON five_s_edit_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can insert edit logs"
ON five_s_edit_log FOR INSERT
TO authenticated
WITH CHECK (true);
