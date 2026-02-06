-- Events need a category column (required, like mixes)
ALTER TABLE events ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized';

-- Store category display order on profiles
ALTER TABLE profiles ADD COLUMN mix_category_order TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN event_category_order TEXT[] DEFAULT '{}';
