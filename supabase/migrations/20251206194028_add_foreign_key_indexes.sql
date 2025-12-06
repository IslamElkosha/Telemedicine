/*
  # Add Indexes for Foreign Keys

  ## Purpose
  Creates indexes on all foreign key columns that don't have covering indexes.
  This eliminates the "Unindexed foreign keys" warnings and improves JOIN query performance.

  ## Tables Affected
  - appointments: addressId, createdByUserId, hospitalId, technicianId
  - audit_logs: userId
  - doctors: hospitalId
  - invoices: paymentId
  - kits: technicianId
  - payments: appointmentId
  - readings: deviceId
  - technician_routes: technicianId
  - technicians: kitId

  ## Performance Impact
  - Dramatically improves JOIN performance
  - Reduces query execution time for foreign key lookups
  - Minimal overhead on INSERT/UPDATE operations
*/

-- appointments table foreign keys
CREATE INDEX IF NOT EXISTS idx_appointments_addressId ON public.appointments("addressId");
CREATE INDEX IF NOT EXISTS idx_appointments_createdByUserId ON public.appointments("createdByUserId");
CREATE INDEX IF NOT EXISTS idx_appointments_hospitalId_fk ON public.appointments("hospitalId");
CREATE INDEX IF NOT EXISTS idx_appointments_technicianId_fk ON public.appointments("technicianId");

-- audit_logs table foreign keys
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId_fk ON public.audit_logs("userId");

-- doctors table foreign keys
CREATE INDEX IF NOT EXISTS idx_doctors_hospitalId_fk ON public.doctors("hospitalId");

-- invoices table foreign keys
CREATE INDEX IF NOT EXISTS idx_invoices_paymentId_fk ON public.invoices("paymentId");

-- kits table foreign keys
CREATE INDEX IF NOT EXISTS idx_kits_technicianId_fk ON public.kits("technicianId");

-- payments table foreign keys
CREATE INDEX IF NOT EXISTS idx_payments_appointmentId_fk ON public.payments("appointmentId");

-- readings table foreign keys
CREATE INDEX IF NOT EXISTS idx_readings_deviceId_fk ON public.readings("deviceId");

-- technician_routes table foreign keys
CREATE INDEX IF NOT EXISTS idx_technician_routes_technicianId_fk ON public.technician_routes("technicianId");

-- technicians table foreign keys
CREATE INDEX IF NOT EXISTS idx_technicians_kitId_fk ON public.technicians("kitId");
