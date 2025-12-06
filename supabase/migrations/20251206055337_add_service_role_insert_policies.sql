/*
  # Add Service Role Insert Policies

  1. Changes
    - Add policies allowing service_role to insert into all tables
    - This enables the trigger function to create user records
    
  2. Security
    - Service role can only be accessed by backend functions
    - Regular users still protected by existing RLS policies
*/

-- Service role can insert users
CREATE POLICY "Service role can insert users"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can insert user_profiles
CREATE POLICY "Service role can insert user_profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can insert doctors
CREATE POLICY "Service role can insert doctors"
  ON doctors
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can insert patients
CREATE POLICY "Service role can insert patients"
  ON patients
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can insert technicians
CREATE POLICY "Service role can insert technicians"
  ON technicians
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also grant service role full access to manage all data
CREATE POLICY "Service role can read all users"
  ON users
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update users"
  ON users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
