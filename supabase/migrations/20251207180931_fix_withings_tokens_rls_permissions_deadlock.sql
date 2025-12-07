/*
  # Fix Withings Tokens Permissions Deadlock

  1. Problem
    - Frontend receives 403 Forbidden when querying withings_tokens
    - Edge functions experience 401 Unauthorized errors
    - Conflicting RLS policies blocking legitimate access

  2. Changes
    - Reset RLS on withings_tokens table
    - Remove all existing conflicting policies
    - Create user policy: Allow authenticated users to read and manage their own tokens
    - Create service role policy: Allow edge functions full access to bypass RLS

  3. Security
    - Users can only access their own token records (auth.uid() = user_id)
    - Service role has full access for OAuth operations
    - RLS remains enabled to protect data
*/

-- 1. Ensure RLS is enabled
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON withings_tokens;

-- 3. Create comprehensive user policy for all operations
-- This fixes the frontend 403 Forbidden errors
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create service role policy for edge functions
-- This ensures edge functions can write tokens without 401/403 errors
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);