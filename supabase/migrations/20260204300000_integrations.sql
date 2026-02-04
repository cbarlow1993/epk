-- Integrations table for third-party service connections
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'google_analytics', 'plausible',
    'soundcloud', 'spotify', 'mixcloud',
    'mailchimp', 'custom_embed'
  )),
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, type)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Owner select on integrations"
  ON integrations FOR SELECT
  USING (is_profile_owner(profile_id));

CREATE POLICY "Owner insert on integrations"
  ON integrations FOR INSERT
  WITH CHECK (is_profile_owner(profile_id));

CREATE POLICY "Owner update on integrations"
  ON integrations FOR UPDATE
  USING (is_profile_owner(profile_id));

CREATE POLICY "Owner delete on integrations"
  ON integrations FOR DELETE
  USING (is_profile_owner(profile_id));

-- Public read (enabled integrations only, for published profiles)
CREATE POLICY "Public read enabled integrations"
  ON integrations FOR SELECT
  USING (
    enabled = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = integrations.profile_id AND published = true
    )
  );
