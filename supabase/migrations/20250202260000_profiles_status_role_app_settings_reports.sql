-- Add status and role to profiles (for admin user management and banned users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

COMMENT ON COLUMN profiles.status IS 'active or banned. Banned users cannot use the app.';
COMMENT ON COLUMN profiles.role IS 'user or admin. Admin can access the admin dashboard.';

-- App settings (pricing, etc.) - key-value store
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('featured_ad_price', '500'),
  ('contact_reveal_credits', '10')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Admin-configurable app settings (pricing, limits).';

-- Reports: users flag ads (scams, bad photos, complaints)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ad_deleted')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_listing ON reports (listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (created_at DESC);

COMMENT ON TABLE reports IS 'User-reported ads. Admin reviews: approve (dismiss) or delete ad.';
