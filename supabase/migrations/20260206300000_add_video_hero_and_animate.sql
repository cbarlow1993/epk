-- Add hero video URL and animate sections toggle
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hero_video_url text,
  ADD COLUMN IF NOT EXISTS animate_sections boolean DEFAULT true;
