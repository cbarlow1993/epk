-- Add onboarding_completed flag to profiles
-- When false, users are redirected to the onboarding wizard
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mark all existing profiles as onboarded so current users are not locked out
UPDATE profiles SET onboarding_completed = true WHERE display_name IS NOT NULL AND display_name != '';
