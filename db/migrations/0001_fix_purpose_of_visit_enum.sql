-- Fix purpose_of_visit enum to match frontend values
-- Add new values that the frontend sends
ALTER TYPE "public"."purpose_of_visit" ADD VALUE IF NOT EXISTS 'enquiry_tour';
ALTER TYPE "public"."purpose_of_visit" ADD VALUE IF NOT EXISTS 'pickup_dropoff';
