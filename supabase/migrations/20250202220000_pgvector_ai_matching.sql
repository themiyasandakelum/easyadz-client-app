-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 = OpenAI text-embedding-ada-002 / text-embedding-3-small)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN profiles.embedding IS 'Vector embedding of bio + preferences for AI matching. Generated via OpenAI.';

-- AI Matching: returns profiles + similarity score. Excludes current user.
CREATE OR REPLACE FUNCTION match_matrimonial_profiles(
  p_query_embedding vector(1536),
  p_match_threshold float DEFAULT 0.5,
  p_match_count int DEFAULT 10,
  p_user_gender text DEFAULT NULL,
  p_exclude_user_id text DEFAULT NULL
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
  education_level text,
  similarity float
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
    p.education_level,
    (1 - (p.embedding <=> p_query_embedding))::float as similarity
  FROM profiles p
  WHERE p.has_matrimonial_profile = true
    AND p.embedding IS NOT NULL
    AND (p_exclude_user_id IS NULL OR p.user_id != p_exclude_user_id)
    AND (p_user_gender IS NULL OR p_user_gender = '' OR p.gender::text != p_user_gender)
    AND (1 - (p.embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY p.embedding <=> p_query_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_match_count, 10), 50));
END;
$$;

COMMENT ON FUNCTION match_matrimonial_profiles IS 'AI semantic matching using pgvector. Pass query embedding from user bio+preferences.';
