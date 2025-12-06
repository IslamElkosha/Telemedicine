/*
  # Add RLS Policies for User Creation Tables

  1. Changes
    - Add service_role policies for doctors, patients, and technicians tables
    - Enable proper user registration flow

  2. Security
    - Only service_role can insert during registration
    - Users can read their own data after authentication
*/

-- Doctors table policies
DROP POLICY IF EXISTS "Service role can insert doctors" ON doctors;
CREATE POLICY "Service role can insert doctors"
  ON doctors
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own doctor profile" ON doctors;
CREATE POLICY "Users can read own doctor profile"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can read all doctor profiles" ON doctors;
CREATE POLICY "Users can read all doctor profiles"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Patients table policies
DROP POLICY IF EXISTS "Service role can insert patients" ON patients;
CREATE POLICY "Service role can insert patients"
  ON patients
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own patient profile" ON patients;
CREATE POLICY "Users can read own patient profile"
  ON patients
  FOR SELECT
  TO authenticated
  USING (id = (auth.uid())::text);

-- Technicians table policies
DROP POLICY IF EXISTS "Service role can insert technicians" ON technicians;
CREATE POLICY "Service role can insert technicians"
  ON technicians
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own technician profile" ON technicians;
CREATE POLICY "Users can read own technician profile"
  ON technicians
  FOR SELECT
  TO authenticated
  USING (id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can read all technician profiles" ON technicians;
CREATE POLICY "Users can read all technician profiles"
  ON technicians
  FOR SELECT
  TO authenticated
  USING (true);
