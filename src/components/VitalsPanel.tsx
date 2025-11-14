import React, { useState, useEffect, useRef } from 'react';
import { Heart, Thermometer, Activity, AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
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

interface VitalsPanelProps {
  patientId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
}

const VitalsPanel: React.FC<VitalsPanelProps> = ({
  patientId,
  autoRefresh = true,
  refreshInterval = 90000,
  compact = false,
}) => {
  const [bpReading, setBpReading] = useState<BPReading | null>(null);
  const [thermoReading, setThermoReading] = useState<ThermoReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [triageAlert, setTriageAlert] = useState<'none' | 'warning' | 'critical'>('none');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchVitals();

    if (autoRefresh) {
      const { data: { session } } = supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;

        const channel = supabase
          .channel('user_vitals_live_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_vitals_live',
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              console.log('Real-time vitals update received:', payload);
              fetchVitals();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [patientId, autoRefresh]);

  const fetchVitals = async () => {
    await Promise.all([fetchBPReading(), fetchThermoReading()]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  const fetchBPReading = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: vitals, error } = await supabase
        .from('user_vitals_live')
        .select('systolic_bp, diastolic_bp, heart_rate, timestamp, device_type')
        .eq('user_id', patientId || session.user.id)
        .not('systolic_bp', 'is', null)
        .not('diastolic_bp', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BP from database:', error);
        return;
      }

      if (vitals && vitals.systolic_bp && vitals.diastolic_bp) {
        console.log('BP data fetched from database:', vitals);
        const bpData: BPReading = {
          systolic: vitals.systolic_bp,
          diastolic: vitals.diastolic_bp,
          heartRate: vitals.heart_rate || undefined,
          measuredAt: vitals.timestamp,
          deviceModel: 'BPM Connect',
          connectionStatus: 'Connected',
        };
        setBpReading(bpData);
        checkTriageStatus(bpData, thermoReading);
      } else {
        console.log('No BP data found in database');
        setBpReading(null);
      }
    } catch (error) {
      console.error('Error fetching BP reading:', error);
    }
  };

  const fetchThermoReading = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: vitals, error } = await supabase
        .from('user_vitals_live')
        .select('*')
        .eq('user_id', patientId || session.user.id)
        .eq('device_type', 'THERMO')
        .maybeSingle();

      if (error) {
        console.error('Error fetching temperature from database:', error);
        return;
      }

      if (vitals) {
        const thermoData: ThermoReading = {
          temperature: vitals.temperature_c,
          measuredAt: vitals.timestamp,
          deviceModel: 'Thermo',
          connectionStatus: 'Connected',
        };
        setThermoReading(thermoData);
        checkTriageStatus(bpReading, thermoData);
      }
    } catch (error) {
      console.error('Error fetching temperature reading:', error);
    }
  };

  const checkTriageStatus = (bp: BPReading | null, temp: ThermoReading | null) => {
    let alert: 'none' | 'warning' | 'critical' = 'none';

    if (bp?.systolic && bp?.diastolic) {
      if (bp.systolic >= 180 || bp.diastolic >= 120) {
        alert = 'critical';
      } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
        if (alert !== 'critical') alert = 'warning';
      } else if (bp.systolic < 90 || bp.diastolic < 60) {
        if (alert !== 'critical') alert = 'warning';
      }
    }

    if (temp?.temperature) {
      if (temp.temperature >= 39.5) {
        alert = 'critical';
      } else if (temp.temperature >= 38.0 || temp.temperature < 35.0) {
        if (alert !== 'critical') alert = 'warning';
      }
    }

    setTriageAlert(alert);
  };

  const getBPStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { color: 'gray', label: 'No Data', bg: 'bg-gray-100' };

    if (systolic >= 180 || diastolic >= 120) {
      return { color: 'red', label: 'CRITICAL', bg: 'bg-red-100 border-red-500' };
    } else if (systolic >= 140 || diastolic >= 90) {
      return { color: 'orange', label: 'HIGH', bg: 'bg-orange-100 border-orange-500' };
    } else if (systolic < 90 || diastolic < 60) {
      return { color: 'yellow', label: 'LOW', bg: 'bg-yellow-100 border-yellow-500' };
    }
    return { color: 'green', label: 'NORMAL', bg: 'bg-green-100 border-green-500' };
  };

  const getTempStatus = (temperature: number) => {
    if (temperature >= 39.5) {
      return { color: 'red', label: 'CRITICAL', bg: 'bg-red-100 border-red-500' };
    } else if (temperature >= 38.0) {
      return { color: 'orange', label: 'ELEVATED', bg: 'bg-orange-100 border-orange-500' };
    } else if (temperature < 35.0) {
      return { color: 'blue', label: 'LOW', bg: 'bg-blue-100 border-blue-500' };
    } else if (temperature < 36.1) {
      return { color: 'yellow', label: 'BELOW NORMAL', bg: 'bg-yellow-100 border-yellow-500' };
    }
    return { color: 'green', label: 'NORMAL', bg: 'bg-green-100 border-green-500' };
  };

  const bpStatus = getBPStatus(bpReading?.systolic, bpReading?.diastolic);
  const tempStatus = thermoReading ? getTempStatus(thermoReading.temperature) : { color: 'gray', label: 'No Data', bg: 'bg-gray-100' };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Loading vitals...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">Patient Vitals</h4>
          {triageAlert !== 'none' && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
              triageAlert === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
            }`}>
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">{triageAlert.toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded border-2 ${bpStatus.bg}`}>
            <div className="flex items-center space-x-1 mb-1">
              <Heart className="h-3 w-3 text-red-600" />
              <span className="text-xs text-gray-600">BP</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {bpReading?.systolic}/{bpReading?.diastolic || '--'}
            </p>
            <p className="text-xs text-gray-500">
              HR: {bpReading?.heartRate || '--'} bpm
            </p>
          </div>

          <div className={`p-2 rounded border-2 ${tempStatus.bg}`}>
            <div className="flex items-center space-x-1 mb-1">
              <Thermometer className="h-3 w-3 text-orange-600" />
              <span className="text-xs text-gray-600">Temp</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {thermoReading?.temperature.toFixed(1) || '--'}°C
            </p>
            <p className="text-xs text-gray-500">{tempStatus.label}</p>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-xs text-gray-400 text-center">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg">
      <div className={`p-4 border-b ${
        triageAlert === 'critical' ? 'bg-red-50 border-red-200' :
        triageAlert === 'warning' ? 'bg-orange-50 border-orange-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Real-Time Vitals Monitor</h3>
          </div>
          {triageAlert !== 'none' && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              triageAlert === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
            }`}>
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold">{triageAlert === 'critical' ? 'CRITICAL' : 'ATTENTION'}</span>
            </div>
          )}
        </div>
        {lastUpdate && (
          <p className="text-xs text-gray-500 mt-1">
            Real-time updates enabled • Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className={`border-2 rounded-lg p-4 ${bpStatus.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-red-600" />
              <h4 className="font-semibold text-gray-900">Blood Pressure</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-${bpStatus.color}-700 bg-${bpStatus.color}-200`}>
              {bpStatus.label}
            </span>
          </div>

          {bpReading && bpReading.connectionStatus === 'Connected' ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Systolic</p>
                  <p className="text-2xl font-bold text-red-600">{bpReading.systolic}</p>
                  <p className="text-xs text-gray-500">mmHg</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Diastolic</p>
                  <p className="text-2xl font-bold text-red-600">{bpReading.diastolic}</p>
                  <p className="text-xs text-gray-500">mmHg</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Heart Rate</p>
                  <p className="text-2xl font-bold text-pink-600">{bpReading.heartRate}</p>
                  <p className="text-xs text-gray-500">bpm</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Last reading: {new Date(bpReading.measuredAt).toLocaleString()}
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Awaiting First Reading</p>
              <p className="text-xs text-gray-400 mt-1">Data will appear when device syncs</p>
            </div>
          )}
        </div>

        <div className={`border-2 rounded-lg p-4 ${tempStatus.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-6 w-6 text-orange-600" />
              <h4 className="font-semibold text-gray-900">Body Temperature</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-${tempStatus.color}-700 bg-${tempStatus.color}-200`}>
              {tempStatus.label}
            </span>
          </div>

          {thermoReading && thermoReading.connectionStatus === 'Connected' ? (
            <>
              <div className="bg-white rounded-lg p-4 text-center mb-3">
                <p className={`text-5xl font-bold text-${tempStatus.color}-600`}>
                  {thermoReading.temperature.toFixed(1)}°C
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {thermoReading.temperature > 37.5 ? 'Fever detected' :
                   thermoReading.temperature < 36.1 ? 'Below normal range' : 'Within normal range'}
                </p>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Last reading: {new Date(thermoReading.measuredAt).toLocaleString()}
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <Thermometer className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Awaiting First Reading</p>
              <p className="text-xs text-gray-400 mt-1">Data will appear when device syncs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VitalsPanel;
