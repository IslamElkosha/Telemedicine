/*
  # Fix Withings Tokens Service Role Access

  ## Problem
  - Edge functions using service_role key cannot access withings_tokens table
  - Results in 406 Not Acceptable errors
  - Need to allow service_role to manage tokens on behalf of users

  ## Solution
  1. Add service_role policies for all operations
  2. Keep existing authenticated user policies
  3. Service role can manage all tokens (needed for OAuth callbacks and refresh operations)

  ## Security
  - Service role policies are necessary for edge functions
  - Edge functions validate user identity before operations
  - RLS remains enabled for authenticated users
*/

-- Add service role policy for SELECT (reading tokens for refresh/sync operations)
CREATE POLICY "Service role can read all Withings tokens"
  ON withings_tokens FOR SELECT
  TO service_role
  USING (true);

-- Add service role policy for INSERT (OAuth callback saves new tokens)
CREATE POLICY "Service role can insert Withings tokens"
  ON withings_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service role policy for UPDATE (token refresh operations)
CREATE POLICY "Service role can update Withings tokens"
  ON withings_tokens FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service role policy for DELETE (unlinking devices)
CREATE POLICY "Service role can delete Withings tokens"
  ON withings_tokens FOR DELETE
  TO service_role
  USING (true);
