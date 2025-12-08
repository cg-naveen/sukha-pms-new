-- Migration: Add visitor_terms_and_conditions column to settings table
-- Run this in Supabase SQL Editor

-- Check if column already exists, if not, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'settings' 
        AND column_name = 'visitor_terms_and_conditions'
    ) THEN
        ALTER TABLE settings 
        ADD COLUMN visitor_terms_and_conditions TEXT;
        
        RAISE NOTICE 'Column visitor_terms_and_conditions added successfully';
    ELSE
        RAISE NOTICE 'Column visitor_terms_and_conditions already exists';
    END IF;
END $$;

