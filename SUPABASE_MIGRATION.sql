-- Run this SQL in Supabase SQL Editor
-- Go to: https://dqxvknzvufbvajftvvcm.supabase.co/project/_/sql/new

-- Add numberOfBeds column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS number_of_beds INTEGER NOT NULL DEFAULT 1;

-- Add billingDate column to residents table
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS billing_date INTEGER NOT NULL DEFAULT 1;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('rooms', 'residents') 
AND column_name IN ('number_of_beds', 'billing_date');

