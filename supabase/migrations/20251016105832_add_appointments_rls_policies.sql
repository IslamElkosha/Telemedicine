/*
  # Add RLS Policies for Appointments Table

  1. Security
    - Enable RLS on appointments table
    - Add policy for authenticated users to create appointments
    - Add policy for patients to read their own appointments
    - Add policy for doctors to read their appointments
    - Add policy for technicians to read their appointments
    - Add policy for updating appointment status and payment

  2. Changes
    - ALTER TABLE appointments ENABLE ROW LEVEL SECURITY
    - CREATE POLICY for INSERT (authenticated users)
    - CREATE POLICY for SELECT (patients, doctors, technicians)
    - CREATE POLICY for UPDATE (patients for payment, doctors/technicians for status)
*/

-- Enable RLS on appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create appointments
CREATE POLICY "Authenticated users can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "createdByUserId");

-- Policy: Users can read their own appointments (as patient)
CREATE POLICY "Users can read appointments where they are the patient"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "patientId");

-- Policy: Users can read appointments where they are the doctor
CREATE POLICY "Users can read appointments where they are the doctor"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "doctorId");

-- Policy: Users can read appointments where they are the technician
CREATE POLICY "Users can read appointments where they are the technician"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "technicianId");

-- Policy: Patients can update payment status for their appointments
CREATE POLICY "Patients can update their appointment payment status"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "patientId")
  WITH CHECK (auth.uid()::text = "patientId");

-- Policy: Doctors can update appointment status and notes
CREATE POLICY "Doctors can update their appointment status"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "doctorId")
  WITH CHECK (auth.uid()::text = "doctorId");

-- Policy: Technicians can update appointment status
CREATE POLICY "Technicians can update their appointment status"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "technicianId")
  WITH CHECK (auth.uid()::text = "technicianId");