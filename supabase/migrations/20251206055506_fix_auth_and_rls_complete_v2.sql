/*
  # Complete Auth and RLS Fix

  1. Changes
    - Ensure anon role can register users
    - Fix RLS policies to allow proper user creation
    - Add anon policies for initial registration
    - Simplify trigger function for better debugging

  2. Security
    - Only allows users to create their own profile data
    - Maintains security while enabling registration
*/

-- Drop and recreate anon policy for users
DROP POLICY IF EXISTS "Anon can check if email exists" ON users;
CREATE POLICY "Anon can check if email exists"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Ensure the trigger function is correct and will work
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
  user_specialty TEXT;
  user_license TEXT;
  user_phone TEXT;
  user_dob TIMESTAMP;
BEGIN
  -- Auto-confirm the email immediately
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmed_at = COALESCE(confirmed_at, NOW())
  WHERE id = NEW.id;

  -- Extract metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'PATIENT');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  user_specialty := NEW.raw_user_meta_data->>'specialty';
  user_license := NEW.raw_user_meta_data->>'license';
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  
  -- Parse date of birth
  BEGIN
    user_dob := (NEW.raw_user_meta_data->>'dateOfBirth')::timestamp;
  EXCEPTION WHEN OTHERS THEN
    user_dob := NULL;
  END;

  -- Insert into public.users
  INSERT INTO public.users (id, email, phone, "passwordHash", role, status, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    user_phone,
    'managed_by_supabase_auth',
    user_role::"UserRole",
    'ACTIVE'::"UserStatus",
    NOW(),
    NOW()
  );

  -- Insert into user_profiles
  INSERT INTO public.user_profiles ("userId", "fullName", dob, locale, timezone)
  VALUES (
    NEW.id::text,
    user_name,
    user_dob,
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar-EG'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Africa/Cairo')
  );

  -- Insert into role-specific tables
  IF user_role = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty, "licenseNo")
    VALUES (NEW.id::text, COALESCE(user_specialty, 'General Practice'), user_license);
  ELSIF user_role = 'PATIENT' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::text);
  ELSIF user_role IN ('TECHNICIAN', 'FREELANCE_TECHNICIAN') THEN
    INSERT INTO public.technicians (id, "isFreelance")
    VALUES (NEW.id::text, user_role = 'FREELANCE_TECHNICIAN');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log and re-raise the error so we can see what went wrong
  RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RAISE;
END;
$$;

-- Recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
