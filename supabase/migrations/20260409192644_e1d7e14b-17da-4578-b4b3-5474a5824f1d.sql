
-- Add new columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS profile_completeness integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completeness_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS wizard_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS kvk_number text,
  ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}';
