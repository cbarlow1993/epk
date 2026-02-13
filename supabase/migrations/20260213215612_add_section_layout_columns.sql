-- Add section layout columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS events_layout text DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS music_layout text DEFAULT 'grid';

-- Add check constraints for enum-like columns
ALTER TABLE profiles
  ADD CONSTRAINT profiles_events_layout_check CHECK (events_layout IN ('grid', 'marquee', 'carousel', 'timeline')),
  ADD CONSTRAINT profiles_music_layout_check CHECK (music_layout IN ('grid', 'featured', 'showcase', 'compact'));

COMMENT ON COLUMN profiles.events_layout IS 'Events section layout: grid, marquee, carousel, or timeline';
COMMENT ON COLUMN profiles.music_layout IS 'Music section layout: grid, featured, showcase, or compact';
