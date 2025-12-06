/*
  # Add INSERT and UPDATE policies for user_profiles

  1. Changes
    - Add policy allowing users to insert their own profile
    - Add policy allowing users to update their own profile
    - Add policies for technicians table

  2. Security
    - Users can only insert/update their own profile data
    - Uses auth.uid() to verify ownership
*/

-- Allow users to insert their own profile
CREATE POLICY "user_profiles_insert_self"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ("userId" = (auth.uid())::text);

-- Allow users to update their own profile
CREATE POLICY "user_profiles_update_self"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING ("userId" = (auth.uid())::text)
  WITH CHECK ("userId" = (auth.uid())::text);

-- Add policies for technicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'technicians' 
    AND policyname = 'technicians_insert_self'
  ) THEN
    EXECUTE 'CREATE POLICY "technicians_insert_self"
      ON technicians
      FOR INSERT
      TO authenticated
      WITH CHECK (id = (auth.uid())::text)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'technicians' 
    AND policyname = 'technicians_select_self'
  ) THEN
    EXECUTE 'CREATE POLICY "technicians_select_self"
      ON technicians
      FOR SELECT
      TO authenticated
      USING (id = (auth.uid())::text)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'technicians' 
    AND policyname = 'technicians_select_others'
  ) THEN
    EXECUTE 'CREATE POLICY "technicians_select_others"
      ON technicians
      FOR SELECT
      TO authenticated
      USING (true)';
  END IF;
END $$;
