-- Replace bio_left and bio_right TEXT columns with a single bio JSONB column
ALTER TABLE profiles DROP COLUMN IF EXISTS bio_left;
ALTER TABLE profiles DROP COLUMN IF EXISTS bio_right;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio JSONB;

-- Change technical_rider columns from TEXT to JSONB
-- Drop defaults first, then nullify empty strings before casting
ALTER TABLE technical_rider ALTER COLUMN preferred_setup DROP DEFAULT;
ALTER TABLE technical_rider ALTER COLUMN alternative_setup DROP DEFAULT;

UPDATE technical_rider SET preferred_setup = NULL WHERE preferred_setup = '' OR preferred_setup IS NULL;
UPDATE technical_rider SET alternative_setup = NULL WHERE alternative_setup = '' OR alternative_setup IS NULL;

ALTER TABLE technical_rider
  ALTER COLUMN preferred_setup TYPE JSONB USING preferred_setup::jsonb,
  ALTER COLUMN alternative_setup TYPE JSONB USING alternative_setup::jsonb;
