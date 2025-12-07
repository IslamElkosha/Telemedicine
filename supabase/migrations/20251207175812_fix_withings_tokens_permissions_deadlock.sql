/*
  # Fix Withings Tokens Permissions Deadlock

  1. Problem Solved
    - Frontend gets 403 Forbidden when checking device connection status
    - RLS policies were blocking legitimate read access
    - Edge functions need unrestricted write access for OAuth flows

  2. Changes Made
    - Reset and enable RLS on `withings_tokens` table
    - Remove conflicting legacy policies
    - Create user policy: Users can SELECT, INSERT, UPDATE, DELETE their own tokens
    - Create service role policy: Edge functions get full access for OAuth operations

  3. Security Notes
    - Users can only access their own tokens (via auth.uid() check)
    - Service role bypasses RLS for backend operations
    - Prevents deadlock between frontend reads and backend writes
*/

-- 1. Reset RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;

-- 3. Policy: Allow Users to SELECT (Read) and DELETE their own tokens
-- This fixes the 403 error on the frontend.
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Policy: Allow Service Role (Edge Functions) FULL access
-- This ensures the backend can always write tokens.
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);