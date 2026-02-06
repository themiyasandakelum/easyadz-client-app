-- Indexes to fix statement timeout on interests API
-- Composite index for COUNT/WHERE receiver_id + status
CREATE INDEX IF NOT EXISTS idx_interests_receiver_status
  ON interests (receiver_id, status);

-- Composite index for profile_verifications LATERAL join (profile_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_profile_verifications_profile_created
  ON profile_verifications (profile_id, created_at DESC);
