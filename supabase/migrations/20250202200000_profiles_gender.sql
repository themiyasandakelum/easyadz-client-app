-- Gender: required for matrimonial matching. male/female.
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add column. Use DEFAULT for existing rows; new profiles must provide it.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender gender_type NOT NULL DEFAULT 'male';

COMMENT ON COLUMN profiles.gender IS 'Required for matrimonial search. Show opposite gender in matches.';

-- Update insert_profile to accept and use gender
CREATE OR REPLACE FUNCTION insert_profile(
  p_user_id text,
  p_name text,
  p_dob date,
  p_lifestyle_preferences jsonb,
  p_gender gender_type DEFAULT 'male'
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (user_id, name, dob, lifestyle_preferences, gender, updated_at)
  VALUES (p_user_id, p_name, p_dob, p_lifestyle_preferences, p_gender, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    dob = EXCLUDED.dob,
    lifestyle_preferences = EXCLUDED.lifestyle_preferences,
    gender = EXCLUDED.gender,
    updated_at = now()
  RETURNING *;
END;
$$;
