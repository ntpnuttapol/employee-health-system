-- Migration: Add new 5S scoring columns (cooperation and helpfulness)
-- Date: 2026-03-27

-- Add score_cooperation column
ALTER TABLE five_s_inspections
ADD COLUMN IF NOT EXISTS score_cooperation INTEGER DEFAULT 0;

-- Add score_helpfulness column
ALTER TABLE five_s_inspections
ADD COLUMN IF NOT EXISTS score_helpfulness INTEGER DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'five_s_inspections'
AND column_name IN ('score_cooperation', 'score_helpfulness', 'score_improvement', 'score_cleanliness', 'score_innovation', 'total_score');
