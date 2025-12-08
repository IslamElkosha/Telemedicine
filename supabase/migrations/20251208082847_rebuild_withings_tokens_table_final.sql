/*
  # Rebuild Withings Tokens Table

  1. Changes
    - Drop existing `withings_tokens` table and recreate from scratch
    - Ensures clean schema without any legacy issues
    
  2. New Table Structure
    - `id` (uuid, primary key) - Auto-generated unique identifier
    - `user_id` (uuid, foreign key) - References auth.users(id), NOT NULL, UNIQUE
    - `access_token` (text) - OAuth access token
    - `refresh_token` (text) - OAuth refresh token
    - `expires_in` (integer) - Token expiration duration in seconds
    - `scope` (text) - OAuth scopes granted
    - `withings_userid` (text) - Withings user identifier
    - `created_at` (timestamptz) - Record creation timestamp
    - `updated_at` (timestamptz) - Record update timestamp
    
  3. Security
    - Enable RLS on `withings_tokens` table
    - Policy: Users can manage their own tokens (SELECT, INSERT, UPDATE, DELETE)
    - Policy: Service role has full access for backend OAuth operations
    
  4. Important Notes
    - This migration will delete any existing token data
    - The UNIQUE constraint on user_id ensures one token record per user
    - Service role policy is critical for edge functions to work
*/

-- 1. DROP and RECREATE Table (To fix any schema mismatches)
DROP TABLE IF EXISTS withings_tokens CASCADE;

CREATE TABLE withings_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_in INTEGER,
    scope TEXT,
    withings_userid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. ENABLE RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 3. PERMISSIONS (Fixes the 403)
-- Allow Users to Read/Write their own data
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow Service Role (Backend) full access
CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);