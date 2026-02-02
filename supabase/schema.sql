-- Profiles table (one per auth user)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  tagline TEXT DEFAULT '',
  bio_left TEXT DEFAULT '',
  bio_right TEXT DEFAULT '',
  genres TEXT[] DEFAULT '{}',
  profile_image_url TEXT DEFAULT '',
  hero_image_url TEXT DEFAULT '',
  accent_color TEXT DEFAULT '#3b82f6',
  bg_color TEXT DEFAULT '#0a0a0f',
  font_family TEXT DEFAULT 'Inter',
  custom_css TEXT DEFAULT '',
  custom_domain TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  stripe_customer_id TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social links
CREATE TABLE social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT DEFAULT '',
  handle TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mixes / sets
CREATE TABLE mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  url TEXT DEFAULT '',
  category TEXT DEFAULT 'commercial',
  thumbnail_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events & brands
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Technical rider
CREATE TABLE technical_rider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_setup TEXT DEFAULT '',
  alternative_setup TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Booking contact
CREATE TABLE booking_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  manager_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Press assets
CREATE TABLE press_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'logo')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_rider ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can read/write their own data
-- Profiles: owner can do everything
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Profiles: public can read published profiles
CREATE POLICY "Public can view published profiles" ON profiles FOR SELECT USING (published = true);

-- Helper function for child table policies
CREATE OR REPLACE FUNCTION is_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Child tables: owner CRUD + public read (if profile is published)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['social_links', 'mixes', 'events', 'technical_rider', 'booking_contact', 'press_assets'])
  LOOP
    EXECUTE format('CREATE POLICY "Owner select on %I" ON %I FOR SELECT USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner insert on %I" ON %I FOR INSERT WITH CHECK (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner update on %I" ON %I FOR UPDATE USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner delete on %I" ON %I FOR DELETE USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public read on %I" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = %I.profile_id AND published = true))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- Reserved slugs that cannot be used by profiles
-- (add more as needed)
CREATE TABLE reserved_slugs (
  slug TEXT PRIMARY KEY
);
INSERT INTO reserved_slugs (slug) VALUES
  ('dashboard'), ('login'), ('signup'), ('admin'), ('api'), ('settings'),
  ('profile'), ('billing'), ('help'), ('support'), ('about'), ('pricing');

-- Auto-create profile on user signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  suffix INT := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    '[^a-z0-9]+', '-', 'g'
  ));
  -- Strip leading/trailing hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug);
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;

  new_slug := base_slug;
  -- Find a unique slug that isn't reserved
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE slug = new_slug)
              AND NOT EXISTS (SELECT 1 FROM reserved_slugs WHERE slug = new_slug);
    suffix := suffix + 1;
    new_slug := base_slug || '-' || suffix;
  END LOOP;

  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    new_slug,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  -- Also create empty technical_rider and booking_contact rows
  INSERT INTO technical_rider (profile_id) VALUES (NEW.id);
  INSERT INTO booking_contact (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER technical_rider_updated_at BEFORE UPDATE ON technical_rider FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER booking_contact_updated_at BEFORE UPDATE ON booking_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Supabase Storage bucket for uploads
-- Run this in the Supabase dashboard under Storage:
-- Create a bucket called "uploads" with public access
