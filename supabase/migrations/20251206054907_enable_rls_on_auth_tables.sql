/*
  # Enable RLS on Authentication Tables

  1. Changes
    - Enable Row Level Security on users table
    - Enable Row Level Security on user_profiles table
    - Enable Row Level Security on doctors table
    - Enable Row Level Security on patients table
    - Enable Row Level Security on technicians table

  2. Security
    - RLS policies already exist for these tables
    - This migration enables RLS enforcement on the tables
    - Users will only be able to access data according to existing policies

  3. Important Notes
    - This fixes the authentication issue where users couldn't access their data
    - All existing RLS policies will now be enforced
*/

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on doctors table
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on technicians table
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
