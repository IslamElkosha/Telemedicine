import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, Activity, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BPReading {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  measuredAt: string;
  deviceModel: string;
  connectionStatus: 'Connected' | 'Disconnected';
}

interface ThermoReading {
  temperature: number;
  measuredAt: string;
  deviceModel: string;
  connectionStatus: 'Connected' | 'Disconnected';
}

interface WithingsDeviceReadingsProps {
  userId?: string;
  showRefresh?: boolean;
}

const WithingsDeviceReadings: React.FC<WithingsDeviceReadingsProps> = ({ userId, showRefresh = true }) => {
  const [bpReading, setBpReading] = useState<BPReading | null>(null);
  const [thermoReading, setThermoReading] = useState<ThermoReading | null>(null);
  const [bpStatus, setBpStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');
  const [thermoStatus, setThermoStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<{ bp: boolean; thermo: boolean }>({ bp: false, thermo: false });
  const [errors, setErrors] = useState<{ bp?: string; thermo?: string }>({});

  useEffect(() => {
    loadReadings();
  }, [userId]);

  const loadReadings = async () => {
    await Promise.all([fetchBPReading(), fetchThermoReading()]);
    setLoading(false);
  };

  const fetchBPReading = async () => {
    try {
      setRefreshing(prev => ({ ...prev, bp: true }));
      setErrors(prev => ({ ...prev, bp: undefined }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setBpStatus('Disconnected');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-latest-bp-reading`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      setBpStatus(result.connectionStatus);

      if (result.success && result.data) {
        setBpReading(result.data);
      } else if (result.error) {
        setErrors(prev => ({ ...prev, bp: result.error }));
      }
    } catch (error: any) {
      console.error('Error fetching BP reading:', error);
      setBpStatus('Disconnected');
      setErrors(prev => ({ ...prev, bp: error.message }));
    } finally {
      setRefreshing(prev => ({ ...prev, bp: false }));
    }
  };

  const fetchThermoReading = async () => {
    try {
      setRefreshing(prev => ({ ...prev, thermo: true }));
      setErrors(prev => ({ ...prev, thermo: undefined }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setThermoStatus('Disconnected');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-latest-thermo-data`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      setThermoStatus(result.connectionStatus);

      if (result.success && result.data) {
        setThermoReading(result.data);
      } else if (result.error) {
        setErrors(prev => ({ ...prev, thermo: result.error }));
      }
    } catch (error: any) {
      console.error('Error fetching temperature reading:', error);
      setThermoStatus('Disconnected');
      setErrors(prev => ({ ...prev, thermo: error.message }));
    } finally {
      setRefreshing(prev => ({ ...prev, thermo: false }));
    }
  };

  const getStatusIcon = (status: 'Connected' | 'Disconnected') => {
    return status === 'Connected'
      ? <CheckCircle className="h-5 w-5 text-green-600" />
      : <XCircle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusColor = (status: 'Connected' | 'Disconnected') => {
    return status === 'Connected'
      ? 'bg-green-50 border-green-200'
      : 'bg-gray-50 border-gray-200';
  };

  const getBPStatusColor = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return '';
    if (systolic > 140 || diastolic > 90) return 'text-red-600';
    if (systolic < 90 || diastolic < 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTempStatusColor = (temperature: number) => {
    if (temperature > 37.5) return 'text-red-600';
    if (temperature < 36.1) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading device readings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`bg-white rounded-xl border p-6 transition-all ${getStatusColor(bpStatus)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Heart className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Blood Pressure Monitor</h3>
              <p className="text-sm text-gray-500">BPM Connect</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(bpStatus)}
            <span className={`text-sm font-medium ${bpStatus === 'Connected' ? 'text-green-600' : 'text-gray-500'}`}>
              {bpStatus}
            </span>
          </div>
        </div>

        {errors.bp && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{errors.bp}</p>
          </div>
        )}

        {bpReading && bpStatus === 'Connected' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Systolic</p>
                <p className={`text-2xl font-bold ${getBPStatusColor(bpReading.systolic, bpReading.diastolic)}`}>
                  {bpReading.systolic}
                </p>
                <p className="text-xs text-gray-500">mmHg</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Diastolic</p>
                <p className={`text-2xl font-bold ${getBPStatusColor(bpReading.systolic, bpReading.diastolic)}`}>
                  {bpReading.diastolic}
                </p>
                <p className="text-xs text-gray-500">mmHg</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Heart Rate</p>
                <p className="text-2xl font-bold text-pink-600">
                  {bpReading.heartRate}
                </p>
                <p className="text-xs text-gray-500">bpm</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Last reading: {new Date(bpReading.measuredAt).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">
              Device: {bpReading.deviceModel}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No blood pressure readings available</p>
        )}

        {showRefresh && (
          <button
            onClick={fetchBPReading}
            disabled={refreshing.bp}
            className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {refreshing.bp ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fetch Latest BP Reading
              </>
            )}
          </button>
        )}
      </div>

      <div className={`bg-white rounded-xl border p-6 transition-all ${getStatusColor(thermoStatus)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Thermometer className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Thermometer</h3>
              <p className="text-sm text-gray-500">Thermo SCT01</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(thermoStatus)}
            <span className={`text-sm font-medium ${thermoStatus === 'Connected' ? 'text-green-600' : 'text-gray-500'}`}>
              {thermoStatus}
            </span>
          </div>
        </div>

        {errors.thermo && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{errors.thermo}</p>
          </div>
        )}

        {thermoReading && thermoStatus === 'Connected' ? (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <p className="text-xs text-gray-500 mb-2">Body Temperature</p>
              <p className={`text-4xl font-bold ${getTempStatusColor(thermoReading.temperature)}`}>
                {thermoReading.temperature.toFixed(1)}°C
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {thermoReading.temperature > 37.5 ? 'Elevated' :
                 thermoReading.temperature < 36.1 ? 'Low' : 'Normal'}
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Last reading: {new Date(thermoReading.measuredAt).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">
              Device: {thermoReading.deviceModel}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No temperature readings available</p>
        )}

        {showRefresh && (
          <button
            onClick={fetchThermoReading}
            disabled={refreshing.thermo}
            className="mt-4 w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {refreshing.thermo ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fetch Latest Temperature
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default WithingsDeviceReadings;
