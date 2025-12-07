/*
  # Improve handle_new_user Function
  
  Enhances the existing user creation trigger function with:
  
  1. Security Improvements
    - Stricter search_path configuration
    - Better permission controls
    - Explicit schema references where needed
  
  2. Performance Optimizations
    - More efficient metadata extraction
    - Reduced redundant operations
    
  3. Better Error Handling
    - More specific error messages
    - Cleaner exception handling
    - Better logging
    
  4. Code Quality
    - Clearer variable naming
    - Better comments
    - More maintainable structure
*/

-- Drop and recreate the function with improvements
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_specialty TEXT;
  v_license TEXT;
  v_phone TEXT;
  v_dob TIMESTAMPTZ;
BEGIN
  -- Auto-confirm email immediately for seamless onboarding
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id AND email_confirmed_at IS NULL;

  -- Extract and validate role (default to PATIENT)
  v_role := UPPER(COALESCE(
    NEW.raw_user_meta_data->>'role',
    'PATIENT'
  ));
  
  -- Validate role is one of the allowed values
  IF v_role NOT IN ('ADMIN', 'PLATFORM_OPS', 'HOSPITAL_ADMIN', 'DOCTOR', 'TECHNICIAN', 'FREELANCE_TECHNICIAN', 'PATIENT') THEN
    RAISE WARNING 'Invalid role % provided, defaulting to PATIENT', v_role;
    v_role := 'PATIENT';
  END IF;

  -- Extract other metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', '');
  v_specialty := NEW.raw_user_meta_data->>'specialty';
  v_license := NEW.raw_user_meta_data->>'license';
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  
  -- Parse date of birth safely
  BEGIN
    v_dob := (NEW.raw_user_meta_data->>'dateOfBirth')::TIMESTAMPTZ;
  EXCEPTION 
    WHEN OTHERS THEN
      v_dob := NULL;
  END;

  -- Insert into public.users
  INSERT INTO public.users (
    id, 
    email, 
    phone, 
    "passwordHash", 
    role, 
    status, 
    "createdAt", 
    "updatedAt"
  )
  VALUES (
    NEW.id::TEXT,
    NEW.email,
    v_phone,
    'managed_by_supabase_auth',
    v_role::"UserRole",
    'ACTIVE'::"UserStatus",
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        "updatedAt" = NOW();

  -- Insert into user_profiles
  INSERT INTO public.user_profiles (
    "userId", 
    "fullName", 
    dob
  )
  VALUES (
    NEW.id::TEXT,
    v_full_name,
    v_dob
  )
  ON CONFLICT ("userId") DO UPDATE
    SET "fullName" = EXCLUDED."fullName",
        dob = EXCLUDED.dob;

  -- Insert into role-specific tables
  IF v_role = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty, "licenseNo")
    VALUES (NEW.id::TEXT, v_specialty, v_license)
    ON CONFLICT (id) DO UPDATE
      SET specialty = EXCLUDED.specialty,
          "licenseNo" = EXCLUDED."licenseNo";
          
  ELSIF v_role = 'PATIENT' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::TEXT)
    ON CONFLICT (id) DO NOTHING;
    
  ELSIF v_role IN ('TECHNICIAN', 'FREELANCE_TECHNICIAN') THEN
    INSERT INTO public.technicians (id, "isFreelance")
    VALUES (NEW.id::TEXT, v_role = 'FREELANCE_TECHNICIAN')
    ON CONFLICT (id) DO UPDATE
      SET "isFreelance" = EXCLUDED."isFreelance";
  END IF;

  RETURN NEW;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error with context
    RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    -- Re-raise to prevent silent failures
    RAISE;
END;
$$;

-- Revoke direct execution permissions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates corresponding records in public.users, user_profiles, and role-specific tables when a new user signs up via Supabase Auth';
