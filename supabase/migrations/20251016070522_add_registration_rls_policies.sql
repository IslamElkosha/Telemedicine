/*
  # Add RLS Policies for User Registration

  1. Purpose
    - Enable users to register and create their own profiles
    - Allow authenticated users to read and update their own data
    - Secure data access with proper RLS policies

  2. Policies Created
    - users table:
      - INSERT: Allow authenticated users to create their own user record
      - SELECT: Allow users to read their own data
      - UPDATE: Allow users to update their own data
    
    - doctors table:
      - INSERT: Allow authenticated users to create their doctor profile
      - SELECT: Allow users to view their own doctor profile
    
    - patients table:
      - INSERT: Allow authenticated users to create their patient profile

  3. Security
    - All policies enforce that users can only access their own data
    - Uses auth.uid() to verify user identity
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "doctors_insert_self" ON doctors;
DROP POLICY IF EXISTS "doctors_select_self" ON doctors;
DROP POLICY IF EXISTS "patients_insert_self" ON patients;

-- Users table policies
CREATE POLICY "users_insert_self"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users_select_self"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY "users_update_self"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Doctors table policies
CREATE POLICY "doctors_insert_self"
  ON doctors
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "doctors_select_self"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

-- Patients table policies
CREATE POLICY "patients_insert_self"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);
