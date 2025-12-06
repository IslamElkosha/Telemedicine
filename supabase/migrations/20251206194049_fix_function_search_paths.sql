/*
  # Fix Function Search Paths

  ## Purpose
  Adds secure search_path to all functions to prevent SQL injection attacks.
  Fixes "Function Search Path Mutable" security warnings.

  ## Functions Fixed
  - update_withings_tokens_updated_at
  - update_ihealth_tokens_updated_at
  - get_user_role
  - update_withings_measurements_updated_at
  - update_user_vitals_live_timestamp
  - session_readings_broadcast_trigger
  - set_created_by_colors
  - _test_colors_user_allowed

  ## Security Impact
  - Prevents search_path manipulation attacks
  - Ensures functions only access intended schemas
  - Required for SECURITY DEFINER functions
*/

-- update_withings_tokens_updated_at
CREATE OR REPLACE FUNCTION public.update_withings_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_ihealth_tokens_updated_at
CREATE OR REPLACE FUNCTION public.update_ihealth_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_uuid::text;
  
  RETURN user_role;
END;
$$;

-- update_withings_measurements_updated_at
CREATE OR REPLACE FUNCTION public.update_withings_measurements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_user_vitals_live_timestamp
CREATE OR REPLACE FUNCTION public.update_user_vitals_live_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- session_readings_broadcast_trigger
CREATE OR REPLACE FUNCTION public.session_readings_broadcast_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify(
    'reading_update',
    json_build_object(
      'sessionId', NEW."sessionId",
      'deviceId', NEW."deviceId",
      'value', NEW.value
    )::text
  );
  RETURN NEW;
END;
$$;

-- set_created_by_colors
CREATE OR REPLACE FUNCTION public.set_created_by_colors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

-- _test_colors_user_allowed
CREATE OR REPLACE FUNCTION public._test_colors_user_allowed(test_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = test_user_id::text
  );
END;
$$;
