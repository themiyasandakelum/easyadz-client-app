-- Profession category ENUM for Smart-Match and search (Sri Lanka)
DO $$ BEGIN
  CREATE TYPE profession_category AS ENUM (
    'Engineering/Tech',
    'Medical/Healthcare',
    'Education/Academic',
    'Finance/Banking',
    'Legal',
    'Government/Public Sector',
    'Business/Entrepreneur',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profession profession_category,
  ADD COLUMN IF NOT EXISTS job_title varchar(100);

COMMENT ON COLUMN profiles.profession IS 'Category for search/Smart-Match; use profession_category ENUM';
COMMENT ON COLUMN profiles.job_title IS 'Specific role e.g. Software Engineer, Doctor (MBBS), School Teacher';
