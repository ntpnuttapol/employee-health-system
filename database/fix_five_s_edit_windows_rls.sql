-- Run this once in Supabase SQL Editor for existing environments.
-- Fixes the 5S edit-window feature for apps that use custom login
-- instead of Supabase Auth sessions.

ALTER TABLE IF EXISTS five_s_edit_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS five_s_edit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read edit windows" ON five_s_edit_windows;
DROP POLICY IF EXISTS "Admins can manage edit windows" ON five_s_edit_windows;
DROP POLICY IF EXISTS "Client can insert edit windows" ON five_s_edit_windows;
DROP POLICY IF EXISTS "Client can update edit windows" ON five_s_edit_windows;

CREATE POLICY "Anyone can read edit windows"
ON five_s_edit_windows FOR SELECT
TO public
USING (true);

CREATE POLICY "Client can insert edit windows"
ON five_s_edit_windows FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Client can update edit windows"
ON five_s_edit_windows FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read edit logs" ON five_s_edit_log;
DROP POLICY IF EXISTS "Anyone can insert edit logs" ON five_s_edit_log;

CREATE POLICY "Anyone can read edit logs"
ON five_s_edit_log FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert edit logs"
ON five_s_edit_log FOR INSERT
TO public
WITH CHECK (true);
