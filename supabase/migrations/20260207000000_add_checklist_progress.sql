ALTER TABLE profiles
ADD COLUMN checklist_progress jsonb DEFAULT '{}'::jsonb;
