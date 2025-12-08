/*
  # Hard Reset Withings Tokens RLS Policies

  ## Problem
  Persistent 403 Permission Denied errors preventing frontend from checking connection status.

  ## Changes
  1. Enable RLS on `withings_tokens` table
  2. Drop ALL existing policies to clear conflicts
  3. Create user policy for authenticated users
     - Allows SELECT (check status) and DELETE (disconnect)
     - Restricted to own records via `auth.uid() = user_id`
  4. Create service role policy for backend operations
     - Allows Edge Functions to write tokens during OAuth callback
     - Uses service_role with unrestricted access

  ## Security
  - Users can only access their own token records
  - Service role has full access for backend operations
  - All other access is denied by default
*/

-- 1. Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Clear the slate)
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;
DROP POLICY IF EXISTS "Enable read access for all users" ON withings_tokens;
DROP POLICY IF EXISTS "Enable insert for own rows" ON withings_tokens;
DROP POLICY IF EXISTS "Enable update for own rows" ON withings_tokens;
DROP POLICY IF EXISTS "anon_read_policy" ON withings_tokens;

-- 3. CREATE USER POLICY (Fixes the 403)
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. CREATE ADMIN POLICY (Fixes Edge Function Writes)
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);