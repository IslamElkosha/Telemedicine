/*
  # Fix Security and Performance Issues
  
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## 1. Foreign Key Indexes (Performance)
  Creates indexes on all foreign key columns to improve join and query performance
  
  ## 2. RLS Policy Optimization (Performance)
  Optimizes all RLS policies by wrapping auth.uid() with (select auth.uid())
  to prevent re-evaluation for each row
  
  ## 3. Function Search Path (Security)
  Fixes search_path for database functions
  
  ## 4. Enable RLS on Public Tables (Security)
  Enables Row Level Security on all public tables
  
  ## 5. Consolidate Permissive Policies (Optimization)
  Consolidates multiple permissive policies into single policies
*/

-- =====================================================
-- SECTION 1: CREATE FOREIGN KEY INDEXES
-- =====================================================

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_userId ON public.addresses("userId");

-- Appointments (7 foreign keys)
CREATE INDEX IF NOT EXISTS idx_appointments_addressId ON public.appointments("addressId");
CREATE INDEX IF NOT EXISTS idx_appointments_createdByUserId ON public.appointments("createdByUserId");
CREATE INDEX IF NOT EXISTS idx_appointments_doctorId ON public.appointments("doctorId");
CREATE INDEX IF NOT EXISTS idx_appointments_hospitalId ON public.appointments("hospitalId");
CREATE INDEX IF NOT EXISTS idx_appointments_patientId ON public.appointments("patientId");
CREATE INDEX IF NOT EXISTS idx_appointments_technicianId ON public.appointments("technicianId");

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON public.audit_logs("userId");

-- Devices
CREATE INDEX IF NOT EXISTS idx_devices_assignedKitId ON public.devices("assignedKitId");
CREATE INDEX IF NOT EXISTS idx_devices_ownerTechnicianId ON public.devices("ownerTechnicianId");

-- Doctors
CREATE INDEX IF NOT EXISTS idx_doctors_hospitalId ON public.doctors("hospitalId");

-- File Assets
CREATE INDEX IF NOT EXISTS idx_file_assets_ownerUserId ON public.file_assets("ownerUserId");

-- Hospital Users
CREATE INDEX IF NOT EXISTS idx_hospital_users_userId ON public.hospital_users("userId");
CREATE INDEX IF NOT EXISTS idx_hospital_users_hospitalId ON public.hospital_users("hospitalId");

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_paymentId ON public.invoices("paymentId");

-- Kits
CREATE INDEX IF NOT EXISTS idx_kits_hospitalId ON public.kits("hospitalId");
CREATE INDEX IF NOT EXISTS idx_kits_technicianId ON public.kits("technicianId");

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON public.notifications("userId");

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_appointmentId ON public.payments("appointmentId");

-- Readings
CREATE INDEX IF NOT EXISTS idx_readings_deviceId ON public.readings("deviceId");
CREATE INDEX IF NOT EXISTS idx_readings_sessionId ON public.readings("sessionId");

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_appointmentId ON public.sessions("appointmentId");

-- Technician Routes
CREATE INDEX IF NOT EXISTS idx_technician_routes_technicianId ON public.technician_routes("technicianId");

-- Technicians
CREATE INDEX IF NOT EXISTS idx_technicians_kitId ON public.technicians("kitId");

-- Withings Measurements
CREATE INDEX IF NOT EXISTS idx_withings_measurements_user_id ON public.withings_measurements(user_id);

-- =====================================================
-- SECTION 2: OPTIMIZE RLS POLICIES
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;

CREATE POLICY "users_select_self" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()::text));

CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()::text));

CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()::text))
  WITH CHECK (id = (select auth.uid()::text));

-- User Profiles policies
DROP POLICY IF EXISTS "user_profiles_insert_self" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_self" ON public.user_profiles;

CREATE POLICY "user_profiles_insert_self" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ("userId" = (select auth.uid()::text));

CREATE POLICY "user_profiles_update_self" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ("userId" = (select auth.uid()::text))
  WITH CHECK ("userId" = (select auth.uid()::text));

-- Doctors policies
DROP POLICY IF EXISTS "doctors_select_self" ON public.doctors;
DROP POLICY IF EXISTS "doctors_insert_self" ON public.doctors;
DROP POLICY IF EXISTS "Users can read own doctor profile" ON public.doctors;

CREATE POLICY "doctors_select_self" ON public.doctors
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()::text));

CREATE POLICY "doctors_insert_self" ON public.doctors
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()::text));

-- Patients policies
DROP POLICY IF EXISTS "patients_insert_self" ON public.patients;
DROP POLICY IF EXISTS "Users can read own patient profile" ON public.patients;

CREATE POLICY "patients_insert_self" ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()::text));

CREATE POLICY "patients_select_self" ON public.patients
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()::text));

-- Technicians policies
DROP POLICY IF EXISTS "technicians_select_self" ON public.technicians;
DROP POLICY IF EXISTS "technicians_insert_self" ON public.technicians;
DROP POLICY IF EXISTS "Users can read own technician profile" ON public.technicians;

CREATE POLICY "technicians_select_self" ON public.technicians
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()::text));

CREATE POLICY "technicians_insert_self" ON public.technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()::text));

-- Appointments policies - Consolidate and optimize
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can read appointments where they are the patient" ON public.appointments;
DROP POLICY IF EXISTS "Users can read appointments where they are the doctor" ON public.appointments;
DROP POLICY IF EXISTS "Users can read appointments where they are the technician" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update their appointment payment status" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can update their appointment status" ON public.appointments;
DROP POLICY IF EXISTS "Technicians can update their appointment status" ON public.appointments;

-- Consolidated SELECT policy for appointments
CREATE POLICY "appointments_select_related_users" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    "patientId" = (select auth.uid()::text) OR 
    "doctorId" = (select auth.uid()::text) OR 
    "technicianId" = (select auth.uid()::text)
  );

-- INSERT policy for appointments
CREATE POLICY "appointments_insert_authenticated" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Consolidated UPDATE policy for appointments
CREATE POLICY "appointments_update_related_users" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    "patientId" = (select auth.uid()::text) OR 
    "doctorId" = (select auth.uid()::text) OR 
    "technicianId" = (select auth.uid()::text)
  )
  WITH CHECK (
    "patientId" = (select auth.uid()::text) OR 
    "doctorId" = (select auth.uid()::text) OR 
    "technicianId" = (select auth.uid()::text)
  );

-- Withings Measurements policies - Consolidate and optimize
DROP POLICY IF EXISTS "Users can read own measurements" ON public.withings_measurements;
DROP POLICY IF EXISTS "Doctors can read patient measurements" ON public.withings_measurements;
DROP POLICY IF EXISTS "Technicians can read assigned patient measurements" ON public.withings_measurements;

-- Consolidated SELECT policy for withings_measurements
CREATE POLICY "withings_measurements_select_authorized" ON public.withings_measurements
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a."patientId" = withings_measurements.user_id
      AND (a."doctorId" = (select auth.uid()::text) OR a."technicianId" = (select auth.uid()::text))
    )
  );

-- User Vitals Live policies
DROP POLICY IF EXISTS "Users can read own vitals" ON public.user_vitals_live;
DROP POLICY IF EXISTS "Users can insert own vitals" ON public.user_vitals_live;
DROP POLICY IF EXISTS "Users can update own vitals" ON public.user_vitals_live;

CREATE POLICY "user_vitals_live_select_self" ON public.user_vitals_live
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "user_vitals_live_insert_self" ON public.user_vitals_live
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_vitals_live_update_self" ON public.user_vitals_live
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- SECTION 3: FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles ("userId", "fullName", locale, timezone)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar-EG'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Africa/Cairo')
  );

  IF NEW.raw_user_meta_data->>'role' = 'PATIENT' THEN
    INSERT INTO public.patients (id) VALUES (NEW.id::text);
  ELSIF NEW.raw_user_meta_data->>'role' = 'DOCTOR' THEN
    INSERT INTO public.doctors (id, specialty) 
    VALUES (NEW.id::text, COALESCE(NEW.raw_user_meta_data->>'specialty', 'General Practice'));
  ELSIF NEW.raw_user_meta_data->>'role' IN ('TECHNICIAN', 'FREELANCE_TECHNICIAN') THEN
    INSERT INTO public.technicians (id, "isFreelance") 
    VALUES (NEW.id::text, (NEW.raw_user_meta_data->>'role' = 'FREELANCE_TECHNICIAN'));
  END IF;

  RETURN NEW;
END;
$$;

-- Fix update_withings_measurements_updated_at function
CREATE OR REPLACE FUNCTION public.update_withings_measurements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_user_vitals_live_timestamp function
CREATE OR REPLACE FUNCTION public.update_user_vitals_live_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- SECTION 4: ENABLE RLS ON PUBLIC TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Geofences - Readable by all authenticated users
CREATE POLICY "geofences_select_all" ON public.geofences
  FOR SELECT
  TO authenticated
  USING (true);

-- Hospitals - Readable by all authenticated users
CREATE POLICY "hospitals_select_all" ON public.hospitals
  FOR SELECT
  TO authenticated
  USING (true);

-- Hospital Users - Users can see their hospital associations
CREATE POLICY "hospital_users_select_own" ON public.hospital_users
  FOR SELECT
  TO authenticated
  USING ("userId" = (select auth.uid()::text));

-- Kits - Technicians can see their assigned kits, admins can see all
CREATE POLICY "kits_select_assigned" ON public.kits
  FOR SELECT
  TO authenticated
  USING (
    "technicianId" = (select auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = (select auth.uid()::text) 
      AND u.role IN ('ADMIN', 'PLATFORM_OPS', 'HOSPITAL_ADMIN')
    )
  );

-- Devices - Technicians can see their devices
CREATE POLICY "devices_select_owned" ON public.devices
  FOR SELECT
  TO authenticated
  USING (
    "ownerTechnicianId" = (select auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = (select auth.uid()::text) 
      AND u.role IN ('ADMIN', 'PLATFORM_OPS', 'HOSPITAL_ADMIN')
    )
  );

-- Addresses - Users can see their own addresses
CREATE POLICY "addresses_select_own" ON public.addresses
  FOR SELECT
  TO authenticated
  USING ("userId" = (select auth.uid()::text));

CREATE POLICY "addresses_insert_own" ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK ("userId" = (select auth.uid()::text));

CREATE POLICY "addresses_update_own" ON public.addresses
  FOR UPDATE
  TO authenticated
  USING ("userId" = (select auth.uid()::text))
  WITH CHECK ("userId" = (select auth.uid()::text));

-- Sessions - Users can see sessions from their appointments
CREATE POLICY "sessions_select_related" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = sessions."appointmentId"
      AND (a."patientId" = (select auth.uid()::text) OR 
           a."doctorId" = (select auth.uid()::text) OR 
           a."technicianId" = (select auth.uid()::text))
    )
  );

-- Readings - Users can see readings from their sessions
CREATE POLICY "readings_select_related" ON public.readings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.appointments a ON a.id = s."appointmentId"
      WHERE s.id = readings."sessionId"
      AND (a."patientId" = (select auth.uid()::text) OR 
           a."doctorId" = (select auth.uid()::text) OR 
           a."technicianId" = (select auth.uid()::text))
    )
  );

-- File Assets - Users can see their own files
CREATE POLICY "file_assets_select_own" ON public.file_assets
  FOR SELECT
  TO authenticated
  USING ("ownerUserId" = (select auth.uid()::text));

CREATE POLICY "file_assets_insert_own" ON public.file_assets
  FOR INSERT
  TO authenticated
  WITH CHECK ("ownerUserId" = (select auth.uid()::text));

-- Payments - Users can see payments for their appointments
CREATE POLICY "payments_select_related" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = payments."appointmentId"
      AND a."patientId" = (select auth.uid()::text)
    )
  );

-- Invoices - Users can see invoices for their payments
CREATE POLICY "invoices_select_related" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.appointments a ON a.id = p."appointmentId"
      WHERE p.id = invoices."paymentId"
      AND a."patientId" = (select auth.uid()::text)
    )
  );

-- Notifications - Users can see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  TO authenticated
  USING ("userId" = (select auth.uid()::text));

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ("userId" = (select auth.uid()::text))
  WITH CHECK ("userId" = (select auth.uid()::text));

-- Technician Routes - Technicians can see their own routes
CREATE POLICY "technician_routes_select_own" ON public.technician_routes
  FOR SELECT
  TO authenticated
  USING ("technicianId" = (select auth.uid()::text));

-- Audit Logs - Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = (select auth.uid()::text) 
      AND u.role IN ('ADMIN', 'PLATFORM_OPS')
    )
  );
