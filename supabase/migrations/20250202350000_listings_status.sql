-- Add status to listings for admin moderation: pending → approved/rejected
-- Marketplace displays only approved ads
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Backfill: existing listings become approved so they stay visible
UPDATE listings SET status = 'approved';

COMMENT ON COLUMN listings.status IS 'pending: awaiting admin approval. approved: visible in marketplace. rejected: hidden.';

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);

-- Update search_listings to return only approved ads
CREATE OR REPLACE FUNCTION search_listings(
  p_search_term text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_price_min decimal DEFAULT NULL,
  p_price_max decimal DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS SETOF listings
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM listings
  WHERE status = 'approved'
    AND (p_category IS NULL OR category = p_category)
    AND (p_search_term IS NULL OR p_search_term = '' OR title ILIKE '%' || p_search_term || '%' OR location ILIKE '%' || p_search_term || '%')
    AND (p_location IS NULL OR p_location = '' OR location ILIKE '%' || p_location || '%')
    AND (p_price_min IS NULL OR price >= p_price_min)
    AND (p_price_max IS NULL OR price <= p_price_max)
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
END;
$$;
