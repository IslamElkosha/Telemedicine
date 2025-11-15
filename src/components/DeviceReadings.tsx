import React, { useState, useEffect } from 'react';
import { Heart, Activity, Thermometer, Zap, Bluetooth, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeviceReading {
  deviceType: string;
  reading: string;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
  connected: boolean;
}

const DeviceReadings: React.FC = () => {
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeviceReadings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchDeviceReadings();
    });

    const channel = supabase
      .channel('user_vitals_live_changes_device_readings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_vitals_live',
        },
        () => {
          console.log('Real-time vitals update received in DeviceReadings');
          fetchDeviceReadings();
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeviceReadings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: vitals, error } = await supabase
        .from('user_vitals_live')
        .select('systolic_bp, diastolic_bp, heart_rate, temperature_c, timestamp, device_type')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching device readings:', error);
        setReadings(getEmptyReadings());
        setLoading(false);
        return;
      }

      const readingsData: DeviceReading[] = [];

      if (vitals) {
        console.log('Device readings fetched from database:', vitals);

        if (vitals.systolic_bp && vitals.diastolic_bp) {
          const bpValue = `${vitals.systolic_bp}/${vitals.diastolic_bp}`;
          let bpStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.systolic_bp >= 180 || vitals.diastolic_bp >= 120) {
            bpStatus = 'critical';
          } else if (vitals.systolic_bp >= 140 || vitals.diastolic_bp >= 90) {
            bpStatus = 'warning';
          } else if (vitals.systolic_bp < 90 || vitals.diastolic_bp < 60) {
            bpStatus = 'warning';
          }

          readingsData.push({
            deviceType: 'Blood Pressure Monitor',
            reading: bpValue,
            unit: 'mmHg',
            timestamp: new Date(vitals.timestamp),
            status: bpStatus,
            icon: Heart,
            connected: true
          });
        }

        if (vitals.heart_rate) {
          let hrStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.heart_rate > 100 || vitals.heart_rate < 60) {
            hrStatus = 'warning';
          }
          if (vitals.heart_rate > 120 || vitals.heart_rate < 50) {
            hrStatus = 'critical';
          }

          readingsData.push({
            deviceType: 'Heart Rate Monitor',
            reading: vitals.heart_rate.toString(),
            unit: 'BPM',
            timestamp: new Date(vitals.timestamp),
            status: hrStatus,
            icon: Activity,
            connected: true
          });
        }

        if (vitals.temperature_c) {
          const tempF = (vitals.temperature_c * 9/5) + 32;
          let tempStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.temperature_c >= 39.5) {
            tempStatus = 'critical';
          } else if (vitals.temperature_c >= 38.0 || vitals.temperature_c < 35.0) {
            tempStatus = 'warning';
          }

          readingsData.push({
            deviceType: 'Digital Thermometer',
            reading: tempF.toFixed(1),
            unit: '°F',
            timestamp: new Date(vitals.timestamp),
            status: tempStatus,
            icon: Thermometer,
            connected: true
          });
        }
      }

      if (readingsData.length === 0) {
        setReadings(getEmptyReadings());
      } else {
        setReadings(readingsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchDeviceReadings:', error);
      setReadings(getEmptyReadings());
      setLoading(false);
    }
  };

  const getEmptyReadings = (): DeviceReading[] => {
    return [
      {
        deviceType: 'Blood Pressure Monitor',
        reading: '--/--',
        unit: 'mmHg',
        timestamp: new Date(),
        status: 'normal',
        icon: Heart,
        connected: false
      },
      {
        deviceType: 'Heart Rate Monitor',
        reading: '--',
        unit: 'BPM',
        timestamp: new Date(),
        status: 'normal',
        icon: Activity,
        connected: false
      },
      {
        deviceType: 'Digital Thermometer',
        reading: '--',
        unit: '°F',
        timestamp: new Date(),
        status: 'normal',
        icon: Thermometer,
        connected: false
      }
    ];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Live Device Readings</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading device readings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Device Readings</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDeviceReadings}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <div className="flex items-center space-x-2">
              <Bluetooth className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">
                {readings.filter(r => r.connected).length}/{readings.length} Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readings.map((reading, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg relative hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <reading.icon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {reading.deviceType}
                  </span>
                </div>
                {reading.connected ? (
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
              </div>

              <div className="mb-3">
                <span className="text-2xl font-bold text-gray-900">
                  {reading.connected ? reading.reading : '--'}
                </span>
                <span className="text-sm text-gray-600 ml-1">{reading.unit}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  !reading.connected ? 'bg-gray-100 text-gray-600' :
                  reading.status === 'normal' ? 'bg-green-100 text-green-800' :
                  reading.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {!reading.connected ? 'Awaiting Reading' : reading.status}
                </span>
                <span className="text-xs text-gray-500">
                  {reading.connected ? reading.timestamp.toLocaleTimeString() : 'No data'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {readings.some(r => !r.connected) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Connect your devices:</strong> Data will appear automatically when your Withings devices sync measurements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceReadings;
