-- Profile verifications: ID photo + selfie, AI face match, admin review

-- Storage bucket for verification images (ID + selfie)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read for verification images (admin panel needs to display them)
CREATE POLICY "Public read verifications"
ON storage.objects FOR SELECT
USING (bucket_id = 'verifications');

CREATE TABLE IF NOT EXISTS profile_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id_image_url text,
  selfie_url text,
  ai_confidence_score float,
  status text NOT NULL DEFAULT 'pending_ai' CHECK (status IN ('pending_ai', 'pending_admin', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_verifications_profile ON profile_verifications (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_verifications_status ON profile_verifications (status);
CREATE INDEX IF NOT EXISTS idx_profile_verifications_created ON profile_verifications (created_at DESC);

COMMENT ON TABLE profile_verifications IS 'ID + selfie verification. AI compares faces; admin approves/rejects.';
