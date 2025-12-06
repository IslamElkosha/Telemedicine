/*
  # Fix Trigger to Bypass RLS

  1. Changes
    - Drop the overly permissive policies
    - Recreate the trigger function to properly bypass RLS
    - Set the function to run with service role privileges
    
  2. Security
    - Only the trigger can create initial user records
    - All other operations still protected by RLS
*/

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow trigger to insert users" ON users;
DROP POLICY IF EXISTS "Allow trigger to insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to insert doctors" ON doctors;
DROP POLICY IF EXISTS "Allow trigger to insert patients" ON patients;
DROP POLICY IF EXISTS "Allow trigger to insert technicians" ON technicians;

-- Recreate the trigger function with RLS bypass
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
  user_phone TEXT;
  user_dob TIMESTAMP;
BEGIN
  -- Disable RLS for this function's operations
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  
  -- Auto-confirm the email immediately
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;

  -- Extract metadata from auth.users
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

  -- Insert into public.users table
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

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles ("userId", "fullName", dob, locale, timezone)
  VALUES (
    NEW.id::text,
    user_name,
    user_dob,
    'ar-EG',
    'Africa/Cairo'
  );

  -- Insert into role-specific tables
  IF user_role = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty, "licenseNo")
    VALUES (NEW.id::text, user_specialty, user_license);
  ELSIF user_role = 'PATIENT' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::text);
  ELSIF user_role = 'TECHNICIAN' OR user_role = 'FREELANCE_TECHNICIAN' THEN
    INSERT INTO public.technicians (id, "isFreelance")
    VALUES (NEW.id::text, user_role = 'FREELANCE_TECHNICIAN');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the actual error for debugging
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RAISE;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
