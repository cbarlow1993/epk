-- Social Preview (Open Graph) columns for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS og_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS og_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_card_type TEXT DEFAULT 'summary_large_image'
  CHECK (twitter_card_type IN ('summary', 'summary_large_image'));
