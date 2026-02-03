-- Degree and family details for Public Profile view
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS family_details text;

COMMENT ON COLUMN profiles.degree IS 'Education degree e.g. BSc, MBBS, CA';
COMMENT ON COLUMN profiles.family_details IS 'Family info for public profile (optional)';

-- Interests: Send Interest / Connect (pending → accepted/rejected)
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS interests_receiver_id_idx ON interests (receiver_id);
CREATE INDEX IF NOT EXISTS interests_sender_id_idx ON interests (sender_id);

COMMENT ON TABLE interests IS 'Send Interest: when user clicks, insert here; trigger push via Firebase to receiver';
