-- Create photos table for gallery section
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Owner CRUD policies
CREATE POLICY "Owner select on photos" ON photos FOR SELECT USING (is_profile_owner(profile_id));
CREATE POLICY "Owner insert on photos" ON photos FOR INSERT WITH CHECK (is_profile_owner(profile_id));
CREATE POLICY "Owner update on photos" ON photos FOR UPDATE USING (is_profile_owner(profile_id));
CREATE POLICY "Owner delete on photos" ON photos FOR DELETE USING (is_profile_owner(profile_id));

-- Public read for published profiles
CREATE POLICY "Public read on photos" ON photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND published = true));
