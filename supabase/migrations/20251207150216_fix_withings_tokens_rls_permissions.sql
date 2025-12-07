/*
  # Fix withings_tokens RLS Permissions
  
  1. Changes
    - Enable RLS on withings_tokens table
    - Remove any conflicting old policies
    - Add policy for users to manage their own tokens (ALL operations)
    - Add policy for service role to have full access
  
  2. Security
    - Users can only access their own token records
    - Service role (edge functions) has full access for automated operations
*/

-- Enable RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Remove old/broken policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service Role full access" ON withings_tokens;

-- Policy 1: Allow Users to Read, Insert, Update, and Delete THEIR OWN rows
CREATE POLICY "Users can manage their own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow Service Role (Edge Functions) full access
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);