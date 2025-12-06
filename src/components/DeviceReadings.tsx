import React, { useState, useEffect } from 'react';
import { Heart, Activity, Thermometer, Bluetooth, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { edgeFunctions } from '../lib/edgeFunctions';

interface DeviceReading {
  deviceType: string;
  reading: string;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
  connected: boolean;
}

interface BPData {
  systolic: number;
  diastolic: number;
  heart_rate: number;
  timestamp: number;
  connectionStatus: string;
  success: boolean;
}

const DeviceReadings: React.FC = () => {
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestBPReading();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchLatestBPReading();
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
          console.log('[DeviceReadings] Real-time vitals update received');
          fetchLatestBPReading();
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestBPReading = async () => {
    try {
      console.log('=== [DeviceReadings] FORCE CLEARING ALL STATE ===');
      setReadings([]);
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[DeviceReadings] No active session');
        setReadings(getEmptyReadings());
        setLoading(false);
        return;
      }

      console.log('[DeviceReadings] Calling fetch-latest-bp-reading Edge Function...');

      const result = await edgeFunctions.fetchLatestBPReading();

      if (!result.success) {
        console.error('[DeviceReadings] Error:', result.error);
        const errorData = result.details;

        if (errorData?.needsReconnect || result.error?.includes('No Withings connection')) {
          setError('Please connect your Withings device first');
          setReadings(getEmptyReadings());
          setLoading(false);
          return;
        }

        throw new Error(result.error || 'Failed to fetch BP data');
      }

      const bpData: BPData = result.data;
      console.log('=== [DeviceReadings] RAW RESPONSE FROM BACKEND ===');
      console.log('Full response object:', JSON.stringify(bpData, null, 2));
      console.log('Systolic (raw):', bpData.systolic, 'Type:', typeof bpData.systolic);
      console.log('Diastolic (raw):', bpData.diastolic, 'Type:', typeof bpData.diastolic);
      console.log('Heart Rate (raw):', bpData.heart_rate, 'Type:', typeof bpData.heart_rate);
      console.log('Timestamp:', bpData.timestamp, '→', new Date(bpData.timestamp * 1000).toISOString());
      console.log('Success flag:', bpData.success);

      if (!bpData.success || !bpData.systolic || !bpData.diastolic) {
        console.log('[DeviceReadings] No BP data available (success:', bpData.success, ', systolic:', bpData.systolic, ', diastolic:', bpData.diastolic, ')');
        setReadings(getEmptyReadings());
        setLoading(false);
        return;
      }

      console.log('=== [DeviceReadings] BUILDING DISPLAY DATA ===');
      const readingsData: DeviceReading[] = [];

      const bpValue = `${bpData.systolic}/${bpData.diastolic}`;
      console.log('BP Display String:', bpValue);

      let bpStatus: 'normal' | 'warning' | 'critical' = 'normal';

      if (bpData.systolic >= 180 || bpData.diastolic >= 120) {
        bpStatus = 'critical';
      } else if (bpData.systolic >= 140 || bpData.diastolic >= 90) {
        bpStatus = 'warning';
      } else if (bpData.systolic < 90 || bpData.diastolic < 60) {
        bpStatus = 'warning';
      }

      const bpReading = {
        deviceType: 'Blood Pressure Monitor',
        reading: bpValue,
        unit: 'mmHg',
        timestamp: new Date(bpData.timestamp * 1000),
        status: bpStatus,
        icon: Heart,
        connected: true
      };

      console.log('BP Reading Object:', JSON.stringify(bpReading, null, 2));
      readingsData.push(bpReading);

      if (bpData.heart_rate) {
        let hrStatus: 'normal' | 'warning' | 'critical' = 'normal';

        if (bpData.heart_rate > 100 || bpData.heart_rate < 60) {
          hrStatus = 'warning';
        }
        if (bpData.heart_rate > 120 || bpData.heart_rate < 50) {
          hrStatus = 'critical';
        }

        const hrReading = {
          deviceType: 'Heart Rate Monitor',
          reading: bpData.heart_rate.toString(),
          unit: 'BPM',
          timestamp: new Date(bpData.timestamp * 1000),
          status: hrStatus,
          icon: Activity,
          connected: true
        };

        console.log('HR Reading Object:', JSON.stringify(hrReading, null, 2));
        readingsData.push(hrReading);
      }

      console.log('=== [DeviceReadings] FINAL READINGS ARRAY ===');
      console.log('Array length:', readingsData.length);
      console.log('Full array:', JSON.stringify(readingsData, null, 2));
      console.log('=== [DeviceReadings] SETTING STATE (setReadings) ===');

      setReadings(readingsData);
      setLoading(false);

      console.log('=== [DeviceReadings] STATE UPDATE COMPLETE ===');

    } catch (error: any) {
      console.error('[DeviceReadings] Error fetching BP reading:', error);
      setError(error.message || 'Failed to fetch device data');
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
      }
    ];
  };

  console.log('=== [DeviceReadings] RENDER CYCLE ===');
  console.log('Loading state:', loading);
  console.log('Error state:', error);
  console.log('Readings state:', JSON.stringify(readings, null, 2));

  if (loading) {
    console.log('[DeviceReadings] Rendering LOADING state');
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Live Device Readings</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Fetching latest data from Withings...</span>
          </div>
        </div>
      </div>
    );
  }

  console.log('[DeviceReadings] Rendering MAIN UI with', readings.length, 'readings');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Device Readings</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchLatestBPReading}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {readings.map((reading, index) => {
            console.log(`[DeviceReadings] Rendering card ${index}:`, reading.deviceType, '→', reading.reading);
            return (
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
                    {reading.reading}
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
                  {!reading.connected ? 'Awaiting Data' : reading.status}
                </span>
                <span className="text-xs text-gray-500">
                  {reading.connected ? reading.timestamp.toLocaleTimeString() : 'No data'}
                </span>
              </div>
            </div>
            );
          })}
        </div>

        {readings.some(r => !r.connected) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Connect your device:</strong> Data will appear when your Withings BPM Connect syncs measurements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceReadings;
