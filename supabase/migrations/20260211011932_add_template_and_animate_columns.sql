-- Add missing template and animate_sections columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS animate_sections BOOLEAN DEFAULT false;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_template_check CHECK (template IN (
    'default', 'minimal', 'festival', 'underground', 'neon',
    'warehouse', 'sunset', 'haze', 'acid', 'festival-main',
    'monochrome', 'tropicalia', 'strobe'
  ));
