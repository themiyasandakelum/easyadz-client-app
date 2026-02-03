-- Table for matrimonial profiles (Firebase UID as user_id)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  name text NOT NULL,
  dob date NOT NULL,
  lifestyle_preferences jsonb NOT NULL DEFAULT '[]',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups by user_id
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);

-- Function called by the API: insert or update profile, return the row
CREATE OR REPLACE FUNCTION insert_profile(
  p_user_id text,
  p_name text,
  p_dob date,
  p_lifestyle_preferences jsonb
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (user_id, name, dob, lifestyle_preferences, updated_at)
  VALUES (p_user_id, p_name, p_dob, p_lifestyle_preferences, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    dob = EXCLUDED.dob,
    lifestyle_preferences = EXCLUDED.lifestyle_preferences,
    updated_at = now()
  RETURNING *;
END;
$$;
