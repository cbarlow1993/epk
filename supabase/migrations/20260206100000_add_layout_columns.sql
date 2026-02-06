-- Add layout customization columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS section_order text[] DEFAULT ARRAY['bio','music','events','technical','press','contact'],
  ADD COLUMN IF NOT EXISTS section_visibility jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hero_style text DEFAULT 'fullbleed',
  ADD COLUMN IF NOT EXISTS bio_layout text DEFAULT 'two-column';

-- Add check constraints for enum-like columns
ALTER TABLE profiles
  ADD CONSTRAINT profiles_hero_style_check CHECK (hero_style IN ('fullbleed', 'contained', 'minimal')),
  ADD CONSTRAINT profiles_bio_layout_check CHECK (bio_layout IN ('two-column', 'single-column'));

COMMENT ON COLUMN profiles.section_order IS 'Ordered array of section IDs for public page';
COMMENT ON COLUMN profiles.section_visibility IS 'Map of section ID to boolean visibility';
COMMENT ON COLUMN profiles.hero_style IS 'Hero section style: fullbleed, contained, or minimal';
COMMENT ON COLUMN profiles.bio_layout IS 'Bio section layout: two-column or single-column';
