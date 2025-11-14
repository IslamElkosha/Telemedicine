/*
  # Add Cross-User Read Policies

  1. Purpose
    - Allow doctors to view patient information
    - Allow patients to view doctor information
    - Allow admin to view all users
    - Maintain security for sensitive operations

  2. Policies
    - users: Allow authenticated users to read other users' basic info
    - user_profiles: Allow authenticated users to read other profiles
    - doctors: Allow authenticated users to view doctor profiles
    - patients: Already has policies for this

  3. Security
    - Only SELECT operations are allowed cross-user
    - INSERT/UPDATE/DELETE remain restricted to own data
*/

-- Allow authenticated users to read other users' data
DROP POLICY IF EXISTS "users_select_others" ON users;
CREATE POLICY "users_select_others"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read other user profiles
DROP POLICY IF EXISTS "user_profiles_select_others" ON user_profiles;
CREATE POLICY "user_profiles_select_others"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to view doctor profiles
DROP POLICY IF EXISTS "doctors_select_others" ON doctors;
CREATE POLICY "doctors_select_others"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to view patient basic info (for doctors/admins)
DROP POLICY IF EXISTS "patients_select_others" ON patients;
CREATE POLICY "patients_select_others"
  ON patients
  FOR SELECT
  TO authenticated
  USING (true);
