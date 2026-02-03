-- Track whether the user has opted into the matrimonial section (profile is discoverable as a match).
-- Matrimonial presence is managed via Profile Settings, not via "Post Ad".
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_matrimonial_profile boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.has_matrimonial_profile IS 'If true, profile is shown in matrimonial matches; managed in Profile Edit, not in Post Ad';
