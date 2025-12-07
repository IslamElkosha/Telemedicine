/*
  # Fix Withings Tokens RLS Policy

  1. Changes
    - Ensure RLS is enabled on withings_tokens table
    - Drop existing failing policy
    - Create strict UUID-based policy using auth.uid()
  
  2. Security
    - Users can only access their own tokens
    - Policy uses auth.uid() for proper authentication context
    - Both USING and WITH CHECK clauses ensure complete protection
*/

-- Ensure RLS is enabled
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing failing policies
DROP POLICY IF EXISTS "Users can manage their own tokens" ON withings_tokens;

-- Create a strict UUID-based policy
CREATE POLICY "Users can manage their own tokens"
ON withings_tokens
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());