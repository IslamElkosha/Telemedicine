/*
  # Clean Up Withings Tokens RLS Policies

  This migration removes all duplicate and conflicting policies on withings_tokens
  and creates a clean, minimal set of policies.

  ## Changes
  
  1. **Remove All Existing Policies**
     - Drop all 16+ duplicate policies that were accumulating
  
  2. **Create Clean Policy Set**
     - One policy for authenticated users (manage their own tokens)
     - One policy for service_role (Edge Functions can insert/update tokens)
  
  ## Security
  
  - Authenticated users: Can read, update, and delete their own tokens only
  - Service role: Full access for OAuth callback to insert/update tokens
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role has full access" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can delete Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can insert Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can read all Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can update Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert own withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update own withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can view own withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "service reads withings_tokens" ON withings_tokens;
DROP POLICY IF EXISTS "service writes withings_tokens" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_select_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_update_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_upsert_own" ON withings_tokens;

-- Create clean policy set

-- 1. Authenticated users can manage their own tokens
CREATE POLICY "authenticated_users_manage_own_tokens"
ON withings_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Service role has full access (for Edge Functions)
CREATE POLICY "service_role_full_access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
