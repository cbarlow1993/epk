-- Add press-asset columns to files table
ALTER TABLE files ADD COLUMN is_press_asset BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE files ADD COLUMN press_title TEXT;
ALTER TABLE files ADD COLUMN press_type TEXT CHECK (press_type IN ('photo', 'video', 'logo'));
ALTER TABLE files ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN source TEXT NOT NULL DEFAULT 'repo';
-- source values: 'repo', 'press', 'profile', 'hero', 'events', 'editor'

-- Migrate existing press_assets data into files
INSERT INTO files (profile_id, name, file_url, file_type, file_size, is_press_asset, press_title, press_type, sort_order, source)
SELECT profile_id, title, file_url, 'image', 0, true, title, type, sort_order, 'press'
FROM press_assets;

-- Public read RLS policy for press assets on published profiles
CREATE POLICY "Public read press files" ON files FOR SELECT
  USING (is_press_asset = true AND EXISTS (
    SELECT 1 FROM profiles WHERE id = files.profile_id AND published = true
  ));

-- Drop old table (RLS policies and references cascade automatically)
DROP TABLE press_assets;
