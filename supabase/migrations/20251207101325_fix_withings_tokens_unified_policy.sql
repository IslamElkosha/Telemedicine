/*
  # Fix Withings Tokens RLS Policy

  ## Changes
  1. Drop all existing policies (both old individual and the public one)
  2. Create single unified policy for authenticated users
  3. Keep service role policies for edge functions

  ## Security
  - Users can only manage their own tokens (user_id must match auth.uid())
  - Properly scoped to authenticated role (not public)
  - Service role policies remain for edge functions
*/

-- Drop all existing user policies
DROP POLICY IF EXISTS "Users can read own Withings tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can insert own Withings tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can update own Withings tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can delete own Withings tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.withings_tokens;

-- Create single consolidated policy for authenticated users
CREATE POLICY "Users can manage their own tokens"
  ON public.withings_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
