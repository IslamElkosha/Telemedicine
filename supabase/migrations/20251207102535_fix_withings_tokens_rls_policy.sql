/*
  # Fix Withings Tokens RLS Policy

  1. Security Changes
    - Drop existing policies on withings_tokens (if any)
    - Create comprehensive policy allowing users to manage their own tokens
    - Grant permissions to authenticated role for INSERT, SELECT, UPDATE, DELETE operations

  2. Important Notes
    - This fixes the 406 error when querying withings_tokens
    - Users can only access tokens where user_id matches their auth.uid()
    - Service role can bypass RLS (used by edge functions)
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can view own tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.withings_tokens;
DROP POLICY IF EXISTS "Service role has full access to tokens" ON public.withings_tokens;

-- Create the unified policy for authenticated users
CREATE POLICY "Users can manage their own tokens"
ON public.withings_tokens
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Grant all permissions to authenticated role
GRANT ALL ON public.withings_tokens TO authenticated;

-- Ensure the table has RLS enabled (should already be true, but just to be safe)
ALTER TABLE public.withings_tokens ENABLE ROW LEVEL SECURITY;