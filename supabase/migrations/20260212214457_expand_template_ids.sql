-- Expand template IDs: rebrand default → swiss, add new brand default + 15 genre templates
-- This brings the total from 13 to 28 templates.

-- 1. Drop existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_template_check;

-- 2. Migrate existing 'default' rows to 'swiss' (preserving their Swiss theme)
UPDATE profiles SET template = 'swiss' WHERE template = 'default';

-- 3. Update column defaults to match the new brand template (myEPK: orange on dark)
ALTER TABLE profiles
  ALTER COLUMN template SET DEFAULT 'default',
  ALTER COLUMN accent_color SET DEFAULT '#FF5500',
  ALTER COLUMN bg_color SET DEFAULT '#1A1A1A',
  ALTER COLUMN font_family SET DEFAULT 'DM Sans';

-- 4. Re-create CHECK constraint with all 28 template IDs
ALTER TABLE profiles
  ADD CONSTRAINT profiles_template_check CHECK (template IN (
    'default', 'swiss', 'minimal', 'festival', 'underground', 'neon',
    'warehouse', 'sunset', 'haze', 'acid', 'festival-main',
    'monochrome', 'tropicalia', 'strobe',
    'deep-house', 'techno', 'drum-and-bass', 'trance', 'ambient',
    'garage', 'dub', 'y2k', 'vaporwave', 'art-deco',
    'midnight', 'ember', 'arctic', 'jungle', 'lo-fi'
  ));
