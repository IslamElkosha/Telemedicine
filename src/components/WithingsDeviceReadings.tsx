import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, Activity, RefreshCw, CheckCircle, XCircle, AlertCircle, Bug } from 'lucide-react';
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
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'subscribed' | 'error'>('idle');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadReadings();
    checkSubscriptionStatus();

    const { data: { session } } = supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;

      const vitalsChannel = supabase
        .channel('device_readings_updates')
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
            loadReadings();
          }
        )
        .subscribe();

      const tokensChannel = supabase
        .channel('withings_tokens_monitor')
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'withings_tokens',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('Withings tokens deleted:', payload);
            setBpStatus('Disconnected');
            setThermoStatus('Disconnected');
            setBpReading(null);
            setThermoReading(null);
            setErrors({
              bp: 'Connection lost. Please reconnect your Withings device on the Devices page.',
              thermo: 'Connection lost. Please reconnect your Withings device on the Devices page.'
            });
            setSubscriptionStatus('idle');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(vitalsChannel);
        supabase.removeChannel(tokensChannel);
      };
    });
  }, [userId]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        setSubscriptionStatus('subscribed');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      setSubscribing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to enable notifications');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      console.log('Subscribing to Withings notifications...');
      const response = await fetch(`${supabaseUrl}/functions/v1/subscribe-withings-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success || result.alreadySubscribed) {
        setSubscriptionStatus('subscribed');
        alert('Real-time notifications enabled! New readings will appear automatically.');
      } else {
        setSubscriptionStatus('error');
        alert(`Failed to enable notifications: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      setSubscriptionStatus('error');
      alert(`Error: ${error.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  const loadReadings = async () => {
    await Promise.all([fetchBPReading(), fetchThermoReading()]);
    setLoading(false);
  };

  const debugWithingsAPI = async () => {
    try {
      setDebugLoading(true);
      setDebugData(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/debug-withings-data-pull`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setDebugData(result);

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write('<html><head><title>Withings API Debug</title></head><body>');
        newWindow.document.write('<pre style="font-family: monospace; padding: 20px; background: #f5f5f5;">');
        newWindow.document.write(JSON.stringify(result, null, 2));
        newWindow.document.write('</pre></body></html>');
        newWindow.document.close();
      }
    } catch (error: any) {
      console.error('Debug error:', error);
      alert(`Debug error: ${error.message}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const syncWithingsData = async () => {
    try {
      setSyncing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/withings-fetch-measurements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        alert('Data synced successfully! Refreshing...');
        await loadReadings();
      } else {
        alert(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(`Sync error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const fetchBPReading = async () => {
    try {
      console.log('=== [WithingsDeviceReadings] FETCHING BP READING ===');
      setRefreshing(prev => ({ ...prev, bp: true }));
      setErrors(prev => ({ ...prev, bp: undefined }));
      setBpReading(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[WithingsDeviceReadings] No session found');
        setBpStatus('Disconnected');
        return;
      }

      const { data: tokenData } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', userId || session.user.id)
        .maybeSingle();

      if (!tokenData) {
        console.log('[WithingsDeviceReadings] No Withings token found');
        setBpStatus('Disconnected');
        setErrors(prev => ({ ...prev, bp: 'Withings connection expired. Please reconnect your devices on the Devices page.' }));
        return;
      }

      console.log('[WithingsDeviceReadings] Calling fetch-latest-bp-reading Edge Function...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const cacheBuster = Date.now();
      const apiUrl = `${supabaseUrl}/functions/v1/fetch-latest-bp-reading?_t=${cacheBuster}`;

      console.log('[WithingsDeviceReadings] Request URL:', apiUrl);

      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        console.log('[WithingsDeviceReadings] Response status:', response.status);
        console.log('[WithingsDeviceReadings] Response headers:', {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'content-type': response.headers.get('content-type'),
        });
      } catch (fetchError: any) {
        console.error('=== [WithingsDeviceReadings] FETCH ERROR ===');
        console.error('Error name:', fetchError.name);
        console.error('Error message:', fetchError.message);
        console.error('Error type:', fetchError instanceof TypeError ? 'TypeError (Network/CORS)' : 'Other');
        console.error('Full error:', fetchError);

        setBpStatus('Disconnected');
        setErrors(prev => ({
          ...prev,
          bp: `Network error: ${fetchError.message}. This could be a CORS issue, network timeout, or connection problem. Check browser console for details.`
        }));
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[WithingsDeviceReadings] Error response:', errorData);
        setBpStatus('Disconnected');
        setErrors(prev => ({ ...prev, bp: errorData.error || 'Failed to fetch BP data' }));
        return;
      }

      const bpData = await response.json();
      console.log('=== [WithingsDeviceReadings] RAW BACKEND RESPONSE ===');
      console.log('Full response:', JSON.stringify(bpData, null, 2));
      console.log('Systolic:', bpData.systolic);
      console.log('Diastolic:', bpData.diastolic);
      console.log('Heart Rate:', bpData.heart_rate);
      console.log('Timestamp:', bpData.timestamp);

      if (!bpData.success || !bpData.systolic || !bpData.diastolic) {
        console.log('[WithingsDeviceReadings] No BP data in response');
        setBpStatus('Connected');
        setErrors(prev => ({ ...prev, bp: 'Awaiting automatic data push from Withings. Please ensure the patient has recently taken a measurement on their BPM Connect.' }));
        return;
      }

      console.log('=== [WithingsDeviceReadings] SETTING BP READING STATE ===');
      const reading = {
        systolic: bpData.systolic,
        diastolic: bpData.diastolic,
        heartRate: bpData.heart_rate || undefined,
        measuredAt: new Date(bpData.timestamp * 1000).toISOString(),
        deviceModel: 'BPM Connect',
        connectionStatus: 'Connected' as const,
      };
      console.log('Reading object:', JSON.stringify(reading, null, 2));

      setBpStatus('Connected');
      setBpReading(reading);

      console.log('=== [WithingsDeviceReadings] BP FETCH COMPLETE ===');
    } catch (error: any) {
      console.error('[WithingsDeviceReadings] Error fetching BP reading:', error);
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

      const { data: tokenData } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', userId || session.user.id)
        .maybeSingle();

      if (!tokenData) {
        setThermoStatus('Disconnected');
        setErrors(prev => ({ ...prev, thermo: 'Withings connection expired. Please reconnect your devices on the Devices page.' }));
        return;
      }

      const { data: vitals, error } = await supabase
        .from('user_vitals_live')
        .select('*')
        .eq('user_id', userId || session.user.id)
        .eq('device_type', 'THERMO')
        .maybeSingle();

      if (error) {
        console.error('Error fetching temperature from database:', error);
        setThermoStatus('Disconnected');
        setErrors(prev => ({ ...prev, thermo: 'Failed to load data' }));
        return;
      }

      setThermoStatus('Connected');

      if (vitals) {
        setThermoReading({
          temperature: vitals.temperature_c,
          measuredAt: vitals.timestamp,
          deviceModel: 'Thermo',
          connectionStatus: 'Connected',
        });
      } else {
        setErrors(prev => ({ ...prev, thermo: 'Awaiting automatic data push from Withings. Please ensure the patient has recently taken a measurement on their Thermo device.' }));
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

  console.log('=== [WithingsDeviceReadings] RENDER CYCLE ===');
  console.log('Loading:', loading);
  console.log('BP Status:', bpStatus);
  console.log('BP Reading:', JSON.stringify(bpReading, null, 2));
  console.log('BP Error:', errors.bp);

  if (loading) {
    console.log('[WithingsDeviceReadings] Rendering LOADING state');
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading device readings...</span>
        </div>
      </div>
    );
  }

  console.log('[WithingsDeviceReadings] Rendering MAIN UI');

  return (
    <div className="space-y-4">
      {subscriptionStatus !== 'subscribed' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Enable Real-Time Updates</h4>
              <p className="text-sm text-blue-700 mb-3">
                Stop manual refreshing! Click below to enable automatic updates when new measurements are taken.
              </p>
              <button
                onClick={subscribeToNotifications}
                disabled={subscribing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {subscribing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enable Real-Time Notifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {subscriptionStatus === 'subscribed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <h4 className="font-semibold text-green-900">Real-Time Updates Active</h4>
                <p className="text-sm text-green-700">New measurements will appear automatically</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={syncWithingsData}
                disabled={syncing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </button>
              <button
                onClick={debugWithingsAPI}
                disabled={debugLoading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                {debugLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4 mr-2" />
                    Debug API
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
            {console.log('[WithingsDeviceReadings] Rendering BP values:', bpReading.systolic, '/', bpReading.diastolic, 'HR:', bpReading.heartRate)}
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

      </div>
    </div>
  );
};

export default WithingsDeviceReadings;
