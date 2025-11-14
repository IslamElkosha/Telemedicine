/*
  # Create User Registration Trigger

  1. Purpose
    - Automatically create user profile when a new auth user signs up
    - Sync auth.users with public.users table
    - Create role-specific records (doctor, patient, etc.)

  2. Changes
    - Create function to handle new user registration
    - Create trigger on auth.users table
    - Automatically populate public.users, user_profiles, and role-specific tables

  3. Security
    - Uses security definer to bypass RLS during trigger execution
    - Properly handles user metadata from signup
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
  user_specialty TEXT;
  user_license TEXT;
BEGIN
  -- Extract metadata from auth.users
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'PATIENT');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  user_specialty := NEW.raw_user_meta_data->>'specialty';
  user_license := NEW.raw_user_meta_data->>'license';

  -- Insert into public.users table
  INSERT INTO public.users (id, email, phone, passwordHash, role, status, createdAt, updatedAt)
  VALUES (
    NEW.id::text,
    NEW.email,
    NEW.phone,
    'managed_by_supabase_auth',
    user_role,
    'ACTIVE',
    NOW(),
    NOW()
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (userId, fullName, dob)
  VALUES (
    NEW.id::text,
    user_name,
    (NEW.raw_user_meta_data->>'dateOfBirth')::timestamp
  );

  -- Insert into role-specific tables
  IF user_role = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty, licenseNo)
    VALUES (NEW.id::text, user_specialty, user_license);
  ELSIF user_role = 'PATIENT' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::text);
  ELSIF user_role = 'TECHNICIAN' OR user_role = 'FREELANCE_TECHNICIAN' THEN
    INSERT INTO public.technicians (id, isFreelance)
    VALUES (NEW.id::text, user_role = 'FREELANCE_TECHNICIAN');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
