/*
  # Fix Withings Tokens RLS 403 Permission Denied Error

  1. Changes
    - Enable RLS on withings_tokens table
    - Clear all existing conflicting policies
    - Create simple user policy for token management
    - Create service role policy for edge function writes

  2. Security
    - Users can only access their own tokens (auth.uid() = user_id)
    - Service role (edge functions) can write tokens during OAuth callback
    - Fixes 403 Permission Denied during token exchange
*/

-- 1. Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL POLICIES (Clear the slate)
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;
DROP POLICY IF EXISTS "Enable read access for all users" ON withings_tokens;
DROP POLICY IF EXISTS "Enable insert for own rows" ON withings_tokens;
DROP POLICY IF EXISTS "Enable update for own rows" ON withings_tokens;
DROP POLICY IF EXISTS "anon_read_policy" ON withings_tokens;

-- 3. CREATE READ/WRITE POLICY FOR USERS (Fixes the 403 error)
-- This allows the frontend to check status and the user to disconnect.
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. CREATE ADMIN POLICY (Fixes the Callback Write Error)
-- This allows the Edge Function (using Service Role) to save the token.
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
