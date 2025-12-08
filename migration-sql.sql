-- Migration: Add resident classification enum and column
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Create the enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE resident_classification AS ENUM ('independent', 'dependent', 'memory_care');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add classification column to residents table if it doesn't exist
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS classification resident_classification NOT NULL DEFAULT 'independent';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'residents' AND column_name = 'classification';

