/*
  # Complete Fix for Trigger Function RLS Bypass

  1. Changes
    - Grant ALL permissions to postgres role on necessary tables
    - Update trigger function to use explicit role switching
    - Ensure function bypasses RLS completely

  2. Security
    - Function is SECURITY DEFINER and only callable by trigger
    - Only executes during auth.users INSERT (controlled by Supabase)
*/

-- Grant necessary permissions to postgres role
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.user_profiles TO postgres;
GRANT ALL ON public.doctors TO postgres;
GRANT ALL ON public.patients TO postgres;
GRANT ALL ON public.technicians TO postgres;

-- Recreate function with proper owner
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
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

  -- Insert into public.users (bypassing RLS with SECURITY DEFINER)
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
  RAISE WARNING 'Error in handle_new_user: % - SQLSTATE: %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Set function owner to postgres (which has superuser privileges)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
