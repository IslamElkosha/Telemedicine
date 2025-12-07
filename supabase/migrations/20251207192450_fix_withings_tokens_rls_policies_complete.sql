/*
  # Fix Withings Tokens RLS Policies

  1. Security Changes
    - Drop all existing policies on withings_tokens table
    - Create new policy for authenticated users to manage their own tokens
    - Create new policy for service role (edge functions) to have full access
  
  2. Important Notes
    - Users can read, insert, update, and delete their own tokens
    - Service role has unrestricted access for edge function operations
    - This fixes 403 Forbidden errors from frontend and 401 Unauthorized errors from edge functions
*/

-- Drop all existing policies on withings_tokens
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'withings_tokens'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON withings_tokens', policy_record.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own tokens
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow Service Role (Edge Functions) full access
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);