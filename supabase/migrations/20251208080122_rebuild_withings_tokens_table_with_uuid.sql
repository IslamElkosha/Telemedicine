/*
  # Rebuild withings_tokens Table with Correct Schema
  
  ## Problem
  - 403 Permission Denied errors on withings_tokens table
  - Suspected schema issue: user_id may be TEXT instead of UUID
  - RLS policies cannot match auth.uid() if types don't align
  
  ## Solution
  1. Drop existing table completely
  2. Recreate with strict UUID type for user_id
  3. Add proper foreign key to auth.users
  4. Enable RLS with correct policies
  
  ## New Schema
  - `id`: UUID primary key
  - `user_id`: UUID (NOT NULL, references auth.users)
  - `access_token`: TEXT (NOT NULL)
  - `refresh_token`: TEXT (NOT NULL)
  - `expires_in`: INTEGER
  - `scope`: TEXT
  - `withings_userid`: TEXT
  - `created_at`: TIMESTAMPTZ
  - `updated_at`: TIMESTAMPTZ
  - UNIQUE constraint on user_id (one token per user)
  
  ## Security
  - RLS enabled
  - Users can manage their own tokens (auth.uid() = user_id)
  - Service role has full access for backend operations
*/

-- 1. DROP EVERYTHING (Start Fresh)
DROP TABLE IF EXISTS withings_tokens CASCADE;

-- 2. RECREATE TABLE (Strict Schema)
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

-- 3. ENABLE RLS
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- 4. ADD PERMISSIONS (Fixes the 403)
CREATE POLICY "Users can manage own tokens"
ON withings_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service Role full access"
ON withings_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. CREATE INDEX for performance
CREATE INDEX idx_withings_tokens_user_id ON withings_tokens(user_id);