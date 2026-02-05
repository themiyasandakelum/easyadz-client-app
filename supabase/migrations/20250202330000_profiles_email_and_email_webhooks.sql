-- Add email to profiles for notification webhooks (Welcome, Verified, New Message)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN profiles.email IS 'User email for transactional notifications. Set on registration.';

-- Drop old overloads so we have a single insert_profile (avoids "function name is not unique")
DROP FUNCTION IF EXISTS insert_profile(text, text, date, jsonb);
DROP FUNCTION IF EXISTS insert_profile(text, text, date, jsonb, gender_type);

-- Create insert_profile with email parameter
CREATE OR REPLACE FUNCTION insert_profile(
  p_user_id text,
  p_name text,
  p_dob date,
  p_lifestyle_preferences jsonb,
  p_gender gender_type DEFAULT 'male',
  p_email text DEFAULT NULL
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (user_id, name, dob, lifestyle_preferences, gender, email, updated_at)
  VALUES (p_user_id, p_name, p_dob, p_lifestyle_preferences, p_gender, p_email, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    dob = EXCLUDED.dob,
    lifestyle_preferences = EXCLUDED.lifestyle_preferences,
    gender = EXCLUDED.gender,
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now()
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION insert_profile(text, text, date, jsonb, gender_type, text) IS 'Insert or update profile. Pass email for welcome notifications.';
