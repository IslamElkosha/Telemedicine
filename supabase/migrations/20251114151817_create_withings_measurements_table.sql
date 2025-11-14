/*
  # Create Withings Measurements Table

  1. New Tables
    - `withings_measurements`
      - `id` (uuid, primary key)
      - `user_id` (text) - References users.id
      - `measurement_type` (text) - Type: 'blood_pressure', 'temperature', 'heart_rate', 'spo2'
      - `systolic` (integer) - For blood pressure (mmHg)
      - `diastolic` (integer) - For blood pressure (mmHg)
      - `heart_rate` (integer) - Heart rate (bpm)
      - `temperature` (decimal) - Body temperature (Celsius)
      - `spo2` (integer) - Blood oxygen saturation (%)
      - `measured_at` (timestamptz) - When the measurement was taken
      - `device_id` (text) - Withings device identifier
      - `device_model` (text) - Device model name
      - `withings_measure_id` (text, unique) - Withings measurement ID for deduplication
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated

  2. Security
    - Enable RLS on `withings_measurements` table
    - Patients can read their own measurements
    - Doctors can read measurements of their patients
    - Technicians can read measurements they need to see
    - Only system can insert measurements (via Edge Functions)

  3. Indexes
    - Index on user_id for fast lookups
    - Index on measurement_type for filtering
    - Index on measured_at for chronological queries
    - Unique index on withings_measure_id for deduplication
*/

CREATE TABLE IF NOT EXISTS withings_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_type text NOT NULL CHECK (measurement_type IN ('blood_pressure', 'temperature', 'heart_rate', 'spo2', 'weight')),
  systolic integer,
  diastolic integer,
  heart_rate integer,
  temperature decimal(4,2),
  spo2 integer,
  weight decimal(5,2),
  measured_at timestamptz NOT NULL,
  device_id text,
  device_model text,
  withings_measure_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE withings_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own measurements"
  ON withings_measurements
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Doctors can read patient measurements"
  ON withings_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a."doctorId" = auth.uid()::text
      AND a."patientId" = withings_measurements.user_id
    )
  );

CREATE POLICY "Technicians can read assigned patient measurements"
  ON withings_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a."technicianId" = auth.uid()::text
      AND a."patientId" = withings_measurements.user_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_withings_measurements_user_id ON withings_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_measurements_type ON withings_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_withings_measurements_measured_at ON withings_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_withings_measurements_withings_id ON withings_measurements(withings_measure_id);

CREATE OR REPLACE FUNCTION update_withings_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withings_measurements_updated_at_trigger
  BEFORE UPDATE ON withings_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_withings_measurements_updated_at();
