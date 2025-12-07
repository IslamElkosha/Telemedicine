/*
  # Fix Withings Tokens RLS for OAuth Callback

  This migration configures proper Row Level Security (RLS) for the withings_tokens table
  to support the OAuth callback flow.

  ## Changes
  
  1. **RLS Configuration**
     - Enable RLS on withings_tokens table
     - Clean up any existing conflicting policies
  
  2. **User Access Policy**
     - Users can read, update, and delete their own tokens
     - This allows users to check connection status and disconnect devices
     - Scoped by auth.uid() = user_id
  
  3. **Service Role Policy**
     - Service role has full access (INSERT, UPDATE, DELETE, SELECT)
     - This is CRITICAL for the OAuth callback Edge Function
     - Allows the callback function to insert/update tokens after successful OAuth flow
  
  ## Security Notes
  
  - Users can only access their own tokens (via auth.uid())
  - Edge Functions can insert/update tokens using service_role authentication
  - This prevents the 401/403 errors during OAuth callback
*/

-- 1. Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies
DROP POLICY IF EXISTS "Users can manage own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;

-- 3. Policy for Users (Frontend Access)
-- Allows the user to read their connection status and disconnect (delete)
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Policy for Edge Functions (Service Role)
-- CRITICAL: Allows the Callback Edge Function to Insert/Update tokens
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
