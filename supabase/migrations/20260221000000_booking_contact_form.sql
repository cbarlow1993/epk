-- Add contact mode and booking email to booking_contact
ALTER TABLE booking_contact
  ADD COLUMN IF NOT EXISTS contact_mode TEXT DEFAULT 'details',
  ADD COLUMN IF NOT EXISTS booking_email TEXT DEFAULT '';

-- Rate limiting table for contact form submissions
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient rate limit lookups
CREATE INDEX idx_contact_submissions_ip_created
  ON contact_submissions(ip_hash, created_at);

-- RLS: contact_submissions is server-only (no client access needed)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- We'll use getSupabaseAdmin() for rate limit checks, so no public policies needed.
-- Owner can read their own submissions (optional, for future analytics)
CREATE POLICY "Owner select on contact_submissions"
  ON contact_submissions FOR SELECT
  USING (is_profile_owner(profile_id));
