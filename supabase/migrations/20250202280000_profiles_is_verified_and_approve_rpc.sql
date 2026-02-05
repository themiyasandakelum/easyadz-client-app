-- Add is_verified flag to profiles for quick status checks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_verified IS 'True when admin has approved identity verification. Synced from profile_verifications.';

-- RPC: When admin approves, update both profile_verifications and profiles.is_verified
CREATE OR REPLACE FUNCTION approve_user_verification(p_verification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  UPDATE profile_verifications
  SET status = 'approved'
  WHERE id = p_verification_id AND status = 'pending_admin'
  RETURNING profile_id INTO v_profile_id;

  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET is_verified = true WHERE id = v_profile_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION approve_user_verification IS 'Admin approval: sets profile_verifications.status to approved and profiles.is_verified to true.';
