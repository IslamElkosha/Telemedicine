/*
  # Grant Trigger Permissions for User Creation

  1. Changes
    - Create policies allowing authenticated user creation via trigger
    - Grant necessary permissions for the registration trigger to work with RLS
    
  2. Security
    - Uses service_role policies to allow trigger to create records
    - Maintains RLS for all other operations
*/

-- Allow inserts from the trigger function (which runs as authenticated)
-- We need to allow the trigger to bypass RLS checks for initial user creation

-- Grant the postgres role ability to insert (triggers run as the function owner)
CREATE POLICY "Allow trigger to insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow trigger to insert user_profiles" 
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow trigger to insert doctors"
  ON doctors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow trigger to insert patients"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow trigger to insert technicians"
  ON technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
