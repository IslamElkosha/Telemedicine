/*
  # Restore Withings Schema to November 15 Working Version

  This migration ensures the withings_tokens table uses the correct schema
  that was working in November 15, 2025.

  1. Changes
    - Ensure withings_tokens table exists with correct fields
    - Change token_expiry_timestamp (bigint) to expires_at (timestamptz) if needed
    - This matches the November 15 working version

  2. Why
    - The December fixes changed the field names which broke the integration
    - Reverting to the working November 15 schema
*/

-- Create withings_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS withings_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  withings_user_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- If the table exists with token_expiry_timestamp, we need to migrate
DO $$
BEGIN
  -- Check if token_expiry_timestamp exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'token_expiry_timestamp'
  ) THEN
    -- Convert bigint timestamp to timestamptz
    ALTER TABLE withings_tokens
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

    -- Migrate data from token_expiry_timestamp to expires_at
    UPDATE withings_tokens
    SET expires_at = to_timestamp(token_expiry_timestamp)
    WHERE expires_at IS NULL;

    -- Drop the old column
    ALTER TABLE withings_tokens
    DROP COLUMN IF EXISTS token_expiry_timestamp;

    -- Make expires_at NOT NULL after migration
    ALTER TABLE withings_tokens
    ALTER COLUMN expires_at SET NOT NULL;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can delete own Withings tokens" ON withings_tokens;

-- Create RLS policies
CREATE POLICY "Users can read own Withings tokens"
  ON withings_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own Withings tokens"
  ON withings_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own Withings tokens"
  ON withings_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own Withings tokens"
  ON withings_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_withings_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS update_withings_tokens_updated_at_trigger ON withings_tokens;
CREATE TRIGGER update_withings_tokens_updated_at_trigger
  BEFORE UPDATE ON withings_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_withings_tokens_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_tokens_expires_at ON withings_tokens(expires_at);