/*
  # Fix Trigger Function to Show Actual Errors

  1. Changes
    - Remove silent error catching
    - Let errors propagate so we can see what's wrong
    - Add better logging

  2. Security
    - Maintains SECURITY DEFINER
    - Function owned by postgres
*/

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

  RAISE NOTICE 'Creating user with role: %', user_role;

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

  RAISE NOTICE 'Created user record for: %', NEW.email;

  -- Insert into user_profiles
  INSERT INTO public.user_profiles ("userId", "fullName", dob, locale, timezone)
  VALUES (
    NEW.id::text,
    user_name,
    user_dob,
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar-EG'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Africa/Cairo')
  );

  RAISE NOTICE 'Created user profile for: %', NEW.email;

  -- Insert into role-specific tables
  IF user_role = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty, "licenseNo")
    VALUES (NEW.id::text, COALESCE(user_specialty, 'General Practice'), user_license);
    RAISE NOTICE 'Created doctor profile for: %', NEW.email;
  ELSIF user_role = 'PATIENT' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::text);
    RAISE NOTICE 'Created patient profile for: %', NEW.email;
  ELSIF user_role IN ('TECHNICIAN', 'FREELANCE_TECHNICIAN') THEN
    INSERT INTO public.technicians (id, "isFreelance")
    VALUES (NEW.id::text, user_role = 'FREELANCE_TECHNICIAN');
    RAISE NOTICE 'Created technician profile for: %', NEW.email;
  END IF;

  RAISE NOTICE 'Successfully completed user creation for: %', NEW.email;
  RETURN NEW;
END;
$$;

-- Set function owner to postgres
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
