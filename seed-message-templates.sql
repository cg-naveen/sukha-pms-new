-- Seed Wabot Message Templates
-- Run this in Supabase SQL Editor

-- Update existing settings with message templates (if they don't already have values)
UPDATE settings 
SET 
  visitor_approval_message_template = COALESCE(
    visitor_approval_message_template,
    'Hello {visitorName},

Your visit request to {residentName} on {visitDate} at {visitTime} has been approved.

Please present the QR code at the entrance for verification.'
  ),
  visitor_rejection_message_template = COALESCE(
    visitor_rejection_message_template,
    'Hello {visitorName},

We regret to inform you that your visit request to {residentName} on {visitDate} at {visitTime} has been rejected.

Please contact us for more information.

Thank you.'
  ),
  wabot_api_base_url = COALESCE(wabot_api_base_url, 'https://app.wabot.my/api'),
  updated_at = NOW()
WHERE id = (SELECT id FROM settings LIMIT 1);

-- If no settings exist, create them
INSERT INTO settings (
  property_name,
  address,
  contact_email,
  contact_phone,
  enable_email_notifications,
  enable_sms_notifications,
  billing_reminder_days,
  visitor_approval_notification,
  billing_generation_enabled,
  billing_generation_hour,
  billing_generation_minute,
  wabot_api_base_url,
  visitor_approval_message_template,
  visitor_rejection_message_template
)
SELECT 
  'Sukha Senior Resort',
  '',
  '',
  '',
  true,
  false,
  7,
  true,
  true,
  2,
  0,
  'https://app.wabot.my/api',
  'Hello {visitorName},

Your visit request to {residentName} on {visitDate} at {visitTime} has been approved.

Please present the QR code at the entrance for verification.',
  'Hello {visitorName},

We regret to inform you that your visit request to {residentName} on {visitDate} at {visitTime} has been rejected.

Please contact us for more information.

Thank you.'
WHERE NOT EXISTS (SELECT 1 FROM settings);

