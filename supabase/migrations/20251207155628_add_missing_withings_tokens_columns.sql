/*
  # Add Missing Columns to withings_tokens Table

  ## Overview
  This migration adds the missing columns to the withings_tokens table to match
  the OAuth specification requirements.

  ## Changes Made

  1. **Add Missing Columns**
     - `expires_in` (integer) - Token lifetime in seconds (as returned by Withings API)
     - `scope` (text) - OAuth scope permissions granted by the user

  2. **Column Details**
     - `expires_in`: Stores the token lifetime in seconds (e.g., 10800 for 3 hours)
       - NOT NULL with default 0 for safety
       - Will be populated during token refresh/creation
     - `scope`: Stores the OAuth scopes (e.g., "user.metrics,user.activity")
       - Default empty string for backwards compatibility
       - Will be populated during OAuth flow

  3. **Backwards Compatibility**
     - Keeps existing `expires_at` column for easy expiry checking
     - New columns default to safe values for existing rows
     - No data loss or breaking changes

  ## Security
  - No RLS changes needed - existing policies cover all columns
  - Tokens remain accessible only to their owners (auth.uid() = user_id)
*/

-- Add expires_in column (token lifetime in seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'expires_in'
  ) THEN
    ALTER TABLE withings_tokens
    ADD COLUMN expires_in integer NOT NULL DEFAULT 0;
    
    COMMENT ON COLUMN withings_tokens.expires_in IS 'Token expiration time in seconds (as returned by Withings OAuth API)';
  END IF;
END $$;

-- Add scope column (OAuth permission scopes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'scope'
  ) THEN
    ALTER TABLE withings_tokens
    ADD COLUMN scope text NOT NULL DEFAULT '';
    
    COMMENT ON COLUMN withings_tokens.scope IS 'OAuth scope permissions granted (e.g., "user.metrics,user.activity")';
  END IF;
END $$;

-- Rename withings_user_id to withings_userid for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'withings_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'withings_userid'
  ) THEN
    ALTER TABLE withings_tokens
    RENAME COLUMN withings_user_id TO withings_userid;
    
    COMMENT ON COLUMN withings_tokens.withings_userid IS 'Withings platform user identifier';
  END IF;
END $$;

-- Update table comment
COMMENT ON TABLE withings_tokens IS 'Withings OAuth tokens storage - user_id references auth.users(id)';
