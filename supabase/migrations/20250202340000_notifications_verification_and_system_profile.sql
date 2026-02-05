-- System profile for verification and other system notifications
INSERT INTO profiles (id, user_id, name, dob, lifestyle_preferences, gender, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '__system__',
  'EasyAdz',
  '2000-01-01'::date,
  '[]'::jsonb,
  'male'::gender_type,
  'user'
)
ON CONFLICT (user_id) DO NOTHING;

-- Add type and link to notifications for verification alerts
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'interest',
  ADD COLUMN IF NOT EXISTS link text;

COMMENT ON COLUMN notifications.notification_type IS 'interest | verification';
COMMENT ON COLUMN notifications.link IS 'Optional link for verification notifications (e.g. /dashboard/verification)';
