/*
  # Fix Withings Tokens RLS Permissions
  
  1. Changes Made
    - Enable RLS on withings_tokens table
    - Drop existing conflicting policies
    - Create user policy: Users can SELECT, INSERT, UPDATE, DELETE their own tokens
    - Create service role policy: Edge Functions have full access
  
  2. Security
    - Users can only access their own token records
    - Service role (Edge Functions) can manage all tokens for OAuth flows
    - Prevents 403 forbidden errors on token status checks
  
  3. Purpose
    - Resolves permission deadlock preventing users from checking connection status
    - Allows Edge Functions to insert/update tokens during OAuth callback
*/

-- 1. Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;

-- 3. Policy: Allow Users to SELECT, INSERT, UPDATE, DELETE their own rows
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Policy: Allow Service Role (Edge Functions) full access
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);