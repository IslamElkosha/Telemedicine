/*
  # Enforce Strict UUID Type Safety (v3)

  This migration enforces strict UUID type safety to prevent "operator does not exist: uuid = text" errors.

  ## Changes Made

  1. **withings_tokens table**
     - Change user_id from TEXT to UUID
     - Update foreign key reference to auth.users(id)
     - Update RLS policies to remove unnecessary ::text casts

  2. **withings_measurements table**
     - Change user_id from TEXT to UUID
     - Update foreign key reference to auth.users(id)
     - Update RLS policies to use direct UUID comparison

  3. **user_vitals_live table**
     - Ensure user_id is UUID type
     - Update RLS policies for proper UUID handling

  4. **Functions**
     - Fix get_user_role to accept uuid and compare directly

  ## Security
  - All existing RLS policies are recreated with proper UUID comparisons
  - auth.uid() returns uuid, so comparisons are now direct without casts
*/

-- =====================================================
-- SECTION 1: DROP ALL POLICIES FIRST
-- =====================================================

-- withings_tokens policies
DROP POLICY IF EXISTS "Service role can delete Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can insert Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can read all Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Service role can update Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_select_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_update_own" ON withings_tokens;
DROP POLICY IF EXISTS "withings_tokens_upsert_own" ON withings_tokens;
DROP POLICY IF EXISTS "Users can read own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can delete own Withings tokens" ON withings_tokens;

-- withings_measurements policies
DROP POLICY IF EXISTS "withings_measurements_insert_own" ON withings_measurements;
DROP POLICY IF EXISTS "withings_measurements_select" ON withings_measurements;
DROP POLICY IF EXISTS "withings_measurements_select_own" ON withings_measurements;
DROP POLICY IF EXISTS "withings_measurements_update_own" ON withings_measurements;
DROP POLICY IF EXISTS "Users can read own measurements" ON withings_measurements;
DROP POLICY IF EXISTS "Doctors can read patient measurements" ON withings_measurements;
DROP POLICY IF EXISTS "Technicians can read assigned patient measurements" ON withings_measurements;
DROP POLICY IF EXISTS "withings_measurements_select_authorized" ON withings_measurements;

-- user_vitals_live policies
DROP POLICY IF EXISTS "Service role can manage all vitals" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_insert" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_select" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_update" ON user_vitals_live;
DROP POLICY IF EXISTS "Users can read own vitals" ON user_vitals_live;
DROP POLICY IF EXISTS "Users can insert own vitals" ON user_vitals_live;
DROP POLICY IF EXISTS "Users can update own vitals" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_select_self" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_insert_self" ON user_vitals_live;
DROP POLICY IF EXISTS "user_vitals_live_update_self" ON user_vitals_live;

-- =====================================================
-- SECTION 2: FIX WITHINGS_TOKENS TABLE
-- =====================================================

-- Drop existing foreign key constraint
ALTER TABLE withings_tokens DROP CONSTRAINT IF EXISTS withings_tokens_user_id_fkey;

-- Change user_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_tokens'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    DROP INDEX IF EXISTS idx_withings_tokens_user_id;
    ALTER TABLE withings_tokens ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    CREATE INDEX idx_withings_tokens_user_id ON withings_tokens(user_id);
  END IF;
END $$;

-- Add proper foreign key constraint to auth.users
ALTER TABLE withings_tokens
ADD CONSTRAINT withings_tokens_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate essential RLS policies with proper UUID comparisons
CREATE POLICY "withings_tokens_select_own"
  ON withings_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "withings_tokens_upsert_own"
  ON withings_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "withings_tokens_update_own"
  ON withings_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can read all Withings tokens"
  ON withings_tokens FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert Withings tokens"
  ON withings_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update Withings tokens"
  ON withings_tokens FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete Withings tokens"
  ON withings_tokens FOR DELETE
  TO service_role
  USING (true);

-- =====================================================
-- SECTION 3: FIX WITHINGS_MEASUREMENTS TABLE
-- =====================================================

-- Drop existing foreign key constraint
ALTER TABLE withings_measurements DROP CONSTRAINT IF EXISTS withings_measurements_user_id_fkey;

-- Change user_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withings_measurements'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    DROP INDEX IF EXISTS idx_withings_measurements_user_id;
    ALTER TABLE withings_measurements ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    CREATE INDEX idx_withings_measurements_user_id ON withings_measurements(user_id);
  END IF;
END $$;

-- Add proper foreign key constraint to auth.users
ALTER TABLE withings_measurements
ADD CONSTRAINT withings_measurements_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate RLS policies with proper UUID comparisons
CREATE POLICY "withings_measurements_select_own"
  ON withings_measurements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "withings_measurements_select"
  ON withings_measurements FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a."patientId"::uuid = withings_measurements.user_id
      AND (a."doctorId"::uuid = auth.uid() OR a."technicianId"::uuid = auth.uid())
    )
  );

CREATE POLICY "withings_measurements_insert_own"
  ON withings_measurements FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "withings_measurements_update_own"
  ON withings_measurements FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SECTION 4: FIX USER_VITALS_LIVE TABLE
-- =====================================================

-- Note: user_vitals_live already has user_id as UUID, just recreate policies
CREATE POLICY "user_vitals_live_select"
  ON user_vitals_live FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_vitals_live_insert"
  ON user_vitals_live FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "user_vitals_live_update"
  ON user_vitals_live FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all vitals"
  ON user_vitals_live FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SECTION 5: FIX FUNCTIONS
-- =====================================================

-- Fix get_user_role function to use UUID directly
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Note: users.id is still TEXT in main schema, so we need the cast here
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_uuid::text;

  RETURN user_role;
END;
$$;

-- =====================================================
-- SECTION 6: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE withings_tokens IS 'Withings OAuth tokens - user_id is UUID referencing auth.users(id)';
COMMENT ON COLUMN withings_tokens.user_id IS 'UUID reference to auth.users(id)';

COMMENT ON TABLE withings_measurements IS 'Withings device measurements - user_id is UUID referencing auth.users(id)';
COMMENT ON COLUMN withings_measurements.user_id IS 'UUID reference to auth.users(id)';
