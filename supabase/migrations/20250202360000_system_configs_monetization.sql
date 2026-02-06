-- System config: master switch for pricing, no code deploy needed
CREATE TABLE IF NOT EXISTS system_configs (
  key text PRIMARY KEY,
  value_text text,
  value_numeric numeric,
  is_enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_configs IS 'Admin-configurable feature toggles and pricing. Flip switches without redeploy.';

-- Initial setup: release as FREE
INSERT INTO system_configs (key, value_numeric, is_enabled, description) VALUES
  ('enable_ad_pricing', 0, false, 'Global toggle for charging for ads'),
  ('price_featured_ad', 500, false, 'Price for a Featured/Top listing (Rs.)'),
  ('price_verification_fee', 250, false, 'One-time fee for ID verification (Rs.)')
ON CONFLICT (key) DO NOTHING;
