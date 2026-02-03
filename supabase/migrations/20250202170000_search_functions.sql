-- Search for general ads (listings): category + optional search term, location, price range.
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
  WHERE (p_category IS NULL OR category = p_category)
    AND (p_search_term IS NULL OR p_search_term = '' OR title ILIKE '%' || p_search_term || '%' OR location ILIKE '%' || p_search_term || '%')
    AND (p_location IS NULL OR p_location = '' OR location ILIKE '%' || p_location || '%')
    AND (p_price_min IS NULL OR price >= p_price_min)
    AND (p_price_max IS NULL OR price <= p_price_max)
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
END;
$$;

COMMENT ON FUNCTION search_listings IS 'Category-first search for listings. Use for Vehicle, Property, Electronics.';

-- Search for matrimonial profiles: age range, religion, profession. Excludes a user_id (current user).
CREATE OR REPLACE FUNCTION search_profiles(
  p_age_min int DEFAULT NULL,
  p_age_max int DEFAULT NULL,
  p_religion text DEFAULT NULL,
  p_profession text DEFAULT NULL,
  p_exclude_user_id text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  dob date,
  profession text,
  job_title text,
  location text,
  avatar_url text,
  photo_blurred boolean,
  religion text,
  country text,
  region_district text,
  ethnicity text,
  civil_status text,
  education_level text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.dob,
    p.profession,
    p.job_title,
    p.location,
    p.avatar_url,
    p.photo_blurred,
    p.religion,
    p.country,
    p.region_district,
    p.ethnicity,
    p.civil_status,
    p.education_level
  FROM profiles p
  WHERE p.has_matrimonial_profile = true
    AND (p_exclude_user_id IS NULL OR p.user_id != p_exclude_user_id)
    AND (p_age_min IS NULL OR EXTRACT(YEAR FROM AGE(current_date, p.dob))::int >= p_age_min)
    AND (p_age_max IS NULL OR EXTRACT(YEAR FROM AGE(current_date, p.dob))::int <= p_age_max)
    AND (p_religion IS NULL OR p_religion = '' OR p.religion = p_religion)
    AND (p_profession IS NULL OR p_profession = '' OR p.profession = p_profession)
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
END;
$$;

COMMENT ON FUNCTION search_profiles IS 'Matrimonial search: filters by age range, religion, profession. Excludes current user.';
