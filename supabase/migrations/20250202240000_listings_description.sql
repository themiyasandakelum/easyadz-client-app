-- Add description column to listings (required for new ads)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN listings.description IS 'Ad description. Required for posting.';
