-- Switch to manual-only verification: no AI step
-- Update default status and comment. ai_confidence_score remains nullable for backward compatibility.
ALTER TABLE profile_verifications
  ALTER COLUMN status SET DEFAULT 'pending_admin';

COMMENT ON TABLE profile_verifications IS 'ID + selfie verification. Admin reviews manually and approves/rejects.';
