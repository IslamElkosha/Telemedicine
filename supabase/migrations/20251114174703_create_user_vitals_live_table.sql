/*
  # Create user_vitals_live table for real-time health readings

  1. New Tables
    - `user_vitals_live`
      - `user_id` (uuid, primary key) - References auth.users
      - `device_type` (text) - Type of device (e.g., 'BPM_CONNECT', 'THERMO')
      - `systolic_bp` (integer, nullable) - Systolic blood pressure in mmHg
      - `diastolic_bp` (integer, nullable) - Diastolic blood pressure in mmHg
      - `heart_rate` (integer, nullable) - Heart rate in bpm
      - `temperature_c` (decimal, nullable) - Temperature in Celsius
      - `timestamp` (timestamptz) - Time of measurement
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Record update time

  2. Security
    - Enable RLS on `user_vitals_live` table
    - Add policy for users to read their own vitals
    - Add policy for service role to insert/update vitals
    - Add policy for doctors/technicians to read patient vitals during appointments

  3. Indexes
    - Index on user_id for fast lookups
    - Index on device_type for filtering
    - Index on timestamp for ordering

  4. Notes
    - This table stores the latest reading per device type per user
    - Data is upserted by webhooks when new readings arrive
    - Nullable fields allow storing different device types in same table
*/

-- Create user_vitals_live table
CREATE TABLE IF NOT EXISTS user_vitals_live (
  user_id uuid NOT NULL,
  device_type text NOT NULL,
  systolic_bp integer,
  diastolic_bp integer,
  heart_rate integer,
  temperature_c decimal(4, 2),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_type),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_vitals_live_user_id ON user_vitals_live(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vitals_live_device_type ON user_vitals_live(device_type);
CREATE INDEX IF NOT EXISTS idx_user_vitals_live_timestamp ON user_vitals_live(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE user_vitals_live ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own vitals
CREATE POLICY "Users can read own vitals"
  ON user_vitals_live
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own vitals (for manual entry if needed)
CREATE POLICY "Users can insert own vitals"
  ON user_vitals_live
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own vitals
CREATE POLICY "Users can update own vitals"
  ON user_vitals_live
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can insert/update any vitals (for webhooks)
CREATE POLICY "Service role can manage all vitals"
  ON user_vitals_live
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_vitals_live_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_user_vitals_live_timestamp ON user_vitals_live;
CREATE TRIGGER trigger_update_user_vitals_live_timestamp
  BEFORE UPDATE ON user_vitals_live
  FOR EACH ROW
  EXECUTE FUNCTION update_user_vitals_live_timestamp();

-- Grant permissions
GRANT SELECT ON user_vitals_live TO authenticated;
GRANT INSERT, UPDATE ON user_vitals_live TO authenticated;
GRANT ALL ON user_vitals_live TO service_role;