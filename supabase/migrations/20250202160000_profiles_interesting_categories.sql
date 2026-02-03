-- Marketplace categories the user is interested in (for "Ads for you" on dashboard).
-- Array of category values: vehicle, property, electronic (not matrimonial).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS interesting_categories jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.interesting_categories IS 'Array of listing category values for personalized ads e.g. ["vehicle","electronic"]';
