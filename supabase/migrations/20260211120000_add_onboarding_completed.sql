-- Add onboarding_completed flag to profiles
-- When false, users are redirected to the onboarding wizard
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
