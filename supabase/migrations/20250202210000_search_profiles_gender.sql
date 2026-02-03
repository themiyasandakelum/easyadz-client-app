-- Add opposite-gender filter to search_profiles for smart matching
CREATE OR REPLACE FUNCTION search_profiles(
  p_age_min int DEFAULT NULL,
  p_age_max int DEFAULT NULL,
  p_religion text DEFAULT NULL,
  p_profession text DEFAULT NULL,
  p_exclude_user_id text DEFAULT NULL,
  p_show_gender text DEFAULT NULL,
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
    p.profession::text,
    p.job_title::text,
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
    AND (p_show_gender IS NULL OR p_show_gender = '' OR p.gender::text = p_show_gender)
    AND (p_age_min IS NULL OR EXTRACT(YEAR FROM AGE(current_date, p.dob))::int >= p_age_min)
    AND (p_age_max IS NULL OR EXTRACT(YEAR FROM AGE(current_date, p.dob))::int <= p_age_max)
    AND (p_religion IS NULL OR p_religion = '' OR p.religion = p_religion)
    AND (p_profession IS NULL OR p_profession = '' OR p.profession::text = p_profession)
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
END;
$$;
