-- Fix: column defaults for accent_color, bg_color, font_family were stale
-- legacy values (#3b82f6 / #0a0a0f / Inter) that don't match any template.
-- The default template is "Swiss" which expects #FF0000 / #FFFFFF / Instrument Sans.

-- 1. Update column defaults for new profiles
ALTER TABLE profiles
  ALTER COLUMN accent_color SET DEFAULT '#FF0000',
  ALTER COLUMN bg_color SET DEFAULT '#FFFFFF',
  ALTER COLUMN font_family SET DEFAULT 'Instrument Sans';

-- 2. Backfill existing profiles still on the old defaults with template='default'
UPDATE profiles
SET accent_color = '#FF0000',
    bg_color = '#FFFFFF',
    font_family = 'Instrument Sans'
WHERE template = 'default'
  AND accent_color = '#3b82f6'
  AND bg_color = '#0a0a0f'
  AND font_family = 'Inter';
