/*
  # Cleanup Duplicate Withings Tokens Policies

  1. Problem
    - Multiple overlapping policies exist on withings_tokens table
    - Old granular policies (select_own, delete_own, upsert_own) still present
    - Duplicate service role and authenticated policies

  2. Changes
    - Remove all old/duplicate policies
    - Keep only the two clean policies created in previous migration
    - Ensures no policy conflicts

  3. Result
    - Only 2 policies remain:
      * "Users can manage own tokens" - for authenticated users
      * "Service Role full access" - for edge functions
*/

-- Drop all old/duplicate policies
DROP POLICY IF EXISTS "authenticated_users_manage_own_tokens" ON withings_tokens;
DROP POLICY IF EXISTS "service_role_full_access" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_delete_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_select_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_upsert_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_update_own" ON withings_tokens;

-- The correct policies already exist from previous migration:
-- - "Users can manage own tokens"
-- - "Service Role full access"