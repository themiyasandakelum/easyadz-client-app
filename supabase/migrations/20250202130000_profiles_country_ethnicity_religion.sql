-- Country, region/district, ethnicity, religion, civil status, education level, language
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region_district text,
  ADD COLUMN IF NOT EXISTS ethnicity text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS civil_status text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS language text;

COMMENT ON COLUMN profiles.country IS 'Country of residence e.g. Sri Lanka';
COMMENT ON COLUMN profiles.region_district IS 'Region or district e.g. Western, Colombo';
COMMENT ON COLUMN profiles.ethnicity IS 'e.g. Sinhalese, Tamil, Muslim, Burgher';
COMMENT ON COLUMN profiles.religion IS 'e.g. Buddhist, Hindu, Christian, Islam';
COMMENT ON COLUMN profiles.civil_status IS 'e.g. Never Married, Divorced, Widowed';
COMMENT ON COLUMN profiles.education_level IS 'e.g. O/L, A/L, Bachelor, Master, PhD';
COMMENT ON COLUMN profiles.language IS 'Primary language(s) e.g. Sinhala, English, Tamil';
