/*
  # Fix User Registration Trigger

  1. Changes
    - Add default values for locale and timezone in user_profiles
    - Update trigger to handle all required fields properly
    - Improve error handling to show actual errors instead of silently failing

  2. Security
    - Maintains SECURITY DEFINER for proper execution
    - Auto-confirms email to allow immediate login
*/

-- Drop and recreate the function with fixed logic
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

  -- Insert into public.users table with correct column names and types
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

  -- Insert into user_profiles table with all required fields
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
END;
$$;
