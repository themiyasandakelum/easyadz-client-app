-- Add columns for profile edit: avatar, bio, location, photo blur (privacy)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_blurred boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.avatar_url IS 'Public URL from Supabase Storage avatars bucket, path profiles/{user_id}/avatar.jpg';
COMMENT ON COLUMN profiles.photo_blurred IS 'When true, show blurred photo to others; Premium can see unblurred';
