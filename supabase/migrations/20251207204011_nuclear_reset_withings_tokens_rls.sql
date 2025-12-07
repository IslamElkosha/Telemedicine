/*
  # Nuclear Reset: Withings Tokens RLS Policies

  ## Problem
  Persistent 403 Permission Denied errors when accessing withings_tokens table.
  Previous RLS policy fixes have failed due to conflicting or duplicate policies.

  ## Changes

  1. **Enable RLS**
     - Ensures Row Level Security is active on withings_tokens

  2. **Nuclear Policy Cleanup**
     - Drops ALL existing policies to eliminate conflicts
     - Policies dropped:
       - "Users can manage own tokens"
       - "Users can view their own tokens"
       - "Service Role full access"
       - "Enable read access for all users"

  3. **User Access Policy**
     - Name: "Users can manage own tokens"
     - Scope: FOR ALL operations
     - Allows authenticated users to:
       - SELECT their own tokens (check connection status)
       - DELETE their own tokens (disconnect device)
       - INSERT their own tokens (via edge functions)
       - UPDATE their own tokens (via edge functions)
     - Security: Only allows access where auth.uid() = user_id

  4. **Service Role Policy**
     - Name: "Service Role full access"
     - Scope: FOR ALL operations, service_role only
     - Allows edge functions (using service role key) to:
       - INSERT tokens after OAuth callback
       - UPDATE tokens during refresh
       - DELETE expired tokens
       - SELECT tokens for validation
     - Security: No restrictions for service_role (bypasses RLS)

  ## Security Notes
  - User data is protected: users can only access their own records
  - Edge functions can write tokens on behalf of users (OAuth flow requirement)
  - No public access: all operations require authentication
*/

-- 1. Enable RLS (Safety)
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR CLEAR: Drop ALL existing policies for this table
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;
DROP POLICY IF EXISTS "Enable read access for all users" ON withings_tokens;

-- 3. Create the "User Access" Policy (Fixes the 403)
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create the "Service Role" Policy (Fixes Edge Function Writes)
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);