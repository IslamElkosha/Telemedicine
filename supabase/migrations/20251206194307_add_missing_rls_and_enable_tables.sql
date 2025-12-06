/*
  # Add Missing RLS Policies and Enable RLS on Public Tables

  ## Purpose
  - Adds policies for tables with RLS enabled but no policies
  - Enables RLS on public tables that don't have it

  ## Tables Fixed
  - geofences: Add admin-only policies
  - technician_routes: Add technician/admin policies  
  - integration_settings: Enable RLS and add admin-only policy

  ## Security Impact
  - Prevents unauthorized access to geofences
  - Secures technician route data
  - Protects integration settings from non-admin access
*/

-- ============================================================================
-- geofences - Admin only access
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'geofences') THEN
    -- Check if policies already exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'geofences' AND policyname = 'geofences_admin_select') THEN
      EXECUTE 'CREATE POLICY geofences_admin_select ON public.geofences FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()::text) AND u.role IN (''ADMIN'', ''HOSPITAL_ADMIN'')))';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'geofences' AND policyname = 'geofences_admin_mutate') THEN
      EXECUTE 'CREATE POLICY geofences_admin_mutate ON public.geofences FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()::text) AND u.role = ''ADMIN'')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()::text) AND u.role = ''ADMIN''))';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- technician_routes - Technician or admin access
-- ============================================================================

DROP POLICY IF EXISTS "technician_routes_select_own_or_admin" ON public.technician_routes;
DROP POLICY IF EXISTS "technician_routes_mutate_own_or_admin" ON public.technician_routes;

CREATE POLICY "technician_routes_select_own_or_admin"
  ON public.technician_routes FOR SELECT
  TO authenticated
  USING (
    "technicianId" = (SELECT auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()::text)
      AND u.role IN ('ADMIN', 'HOSPITAL_ADMIN')
    )
  );

CREATE POLICY "technician_routes_mutate_own_or_admin"
  ON public.technician_routes FOR ALL
  TO authenticated
  USING (
    "technicianId" = (SELECT auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()::text)
      AND u.role IN ('ADMIN', 'HOSPITAL_ADMIN')
    )
  )
  WITH CHECK (
    "technicianId" = (SELECT auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()::text)
      AND u.role IN ('ADMIN', 'HOSPITAL_ADMIN')
    )
  );

-- ============================================================================
-- integration_settings - Enable RLS and add admin-only policy
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integration_settings') THEN
    -- Enable RLS
    ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
    
    -- Add admin-only policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_settings' AND policyname = 'integration_settings_admin_only') THEN
      EXECUTE 'CREATE POLICY integration_settings_admin_only ON public.integration_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()::text) AND u.role = ''ADMIN'')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()::text) AND u.role = ''ADMIN''))';
    END IF;
  END IF;
END $$;
