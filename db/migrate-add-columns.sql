-- Migration: Add numberOfBeds to rooms and billingDate to residents
-- Run this SQL script directly in your database

-- Add numberOfBeds column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS number_of_beds INTEGER NOT NULL DEFAULT 1;

-- Add billingDate column to residents table
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS billing_date INTEGER NOT NULL DEFAULT 1;

