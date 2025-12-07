/*
  # Create Withings OAuth Tokens Storage

  1. New Tables
    - `withings_tokens`
      - `user_id` (uuid, primary key) - References auth.users, identifies the user
      - `access_token` (text) - Withings OAuth access token
      - `refresh_token` (text) - Withings OAuth refresh token for renewing access
      - `expires_in` (integer) - Token expiration time in seconds
      - `scope` (text) - OAuth scope permissions granted
      - `withings_userid` (text) - Withings platform user identifier
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `withings_tokens` table
    - Add policy for authenticated users to SELECT their own tokens
    - Add policy for authenticated users to INSERT their own tokens
    - Add policy for authenticated users to UPDATE their own tokens

  3. Notes
    - User can only have one set of tokens (enforced by primary key on user_id)
    - Timestamps auto-populate on creation and update
    - All policies restrict access to rows where auth.uid() matches user_id
*/

-- Create withings_tokens table
CREATE TABLE IF NOT EXISTS withings_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_in integer NOT NULL,
  scope text NOT NULL DEFAULT '',
  withings_userid text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view their own tokens
CREATE POLICY "Users can view own withings tokens"
  ON withings_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own tokens
CREATE POLICY "Users can insert own withings tokens"
  ON withings_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update their own tokens
CREATE POLICY "Users can update own withings tokens"
  ON withings_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_withings_tokens_updated_at ON withings_tokens;
CREATE TRIGGER update_withings_tokens_updated_at
  BEFORE UPDATE ON withings_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
