import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, Link as LinkIcon, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeviceStatus {
  name: string;
  model: string;
  icon: React.ComponentType<any>;
  connectionStatus: 'Connected' | 'Disconnected';
  lastSync?: Date;
  type: 'bp' | 'thermo';
  color: string;
}

interface WithingsKitDevicesProps {
  onLinkDevice?: () => void;
  compact?: boolean;
}

const WithingsKitDevices: React.FC<WithingsKitDevicesProps> = ({ onLinkDevice, compact = false }) => {
  const [devices, setDevices] = useState<DeviceStatus[]>([
    {
      name: 'Withings BPM Connect',
      model: 'Blood Pressure Monitor',
      icon: Heart,
      connectionStatus: 'Disconnected',
      type: 'bp',
      color: 'red',
    },
    {
      name: 'Withings Thermo (SCT01)',
      model: 'Digital Thermometer',
      icon: Thermometer,
      connectionStatus: 'Disconnected',
      type: 'thermo',
      color: 'orange',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [hasConnection, setHasConnection] = useState(false);

  useEffect(() => {
    checkDeviceStatus();
  }, []);

  const checkDeviceStatus = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setDevices(prev => prev.map(d => ({ ...d, connectionStatus: 'Disconnected' })));
        setHasConnection(false);
        return;
      }

      const { data: tokenData } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (tokenData) {
        const expiresAt = new Date(tokenData.expires_at).getTime();
        const currentTime = Date.now();
        const tokenValidForMs = expiresAt - currentTime;

        if (tokenValidForMs < 0) {
          console.warn('Token expired! Time since expiry:', Math.abs(tokenValidForMs) / 1000, 'seconds');
          setHasConnection(false);
          setDevices(prev => prev.map(d => ({ ...d, connectionStatus: 'Disconnected' })));

          await supabase
            .from('withings_tokens')
            .delete()
            .eq('user_id', session.user.id);

          return;
        }

        setHasConnection(true);
        subscribeToNotifications();

        const { data: bpMeasurements } = await supabase
          .from('withings_measurements')
          .select('measured_at')
          .eq('user_id', session.user.id)
          .eq('measurement_type', 'blood_pressure')
          .order('measured_at', { ascending: false })
          .limit(1);

        const { data: thermoMeasurements } = await supabase
          .from('withings_measurements')
          .select('measured_at')
          .eq('user_id', session.user.id)
          .eq('measurement_type', 'temperature')
          .order('measured_at', { ascending: false })
          .limit(1);

        setDevices(prev => prev.map(device => {
          if (device.type === 'bp') {
            return {
              ...device,
              connectionStatus: 'Connected',
              lastSync: bpMeasurements?.[0]?.measured_at
                ? new Date(bpMeasurements[0].measured_at)
                : undefined,
            };
          } else if (device.type === 'thermo') {
            return {
              ...device,
              connectionStatus: 'Connected',
              lastSync: thermoMeasurements?.[0]?.measured_at
                ? new Date(thermoMeasurements[0].measured_at)
                : undefined,
            };
          }
          return device;
        }));
      } else {
        setHasConnection(false);
        setDevices(prev => prev.map(d => ({ ...d, connectionStatus: 'Disconnected' })));
      }
    } catch (error) {
      console.error('Error checking device status:', error);
      setDevices(prev => prev.map(d => ({ ...d, connectionStatus: 'Disconnected' })));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDevice = async () => {
    try {
      console.log('[WithingsKitDevices] Getting fresh session for device linking...');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[WithingsKitDevices] No active session found');
        alert('Please log in to connect Withings devices');
        return;
      }

      console.log('[WithingsKitDevices] Session obtained, user ID:', session.user.id);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      console.log('[WithingsKitDevices] Initiating force relink to clear any expired tokens...');
      console.log('[WithingsKitDevices] Using Authorization header with token');

      const response = await fetch(`${supabaseUrl}/functions/v1/force-withings-relink`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[WithingsKitDevices] Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to generate authorization URL';

        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;

          if (response.status === 401) {
            console.error('[WithingsKitDevices] 401 Unauthorized - Session may be invalid');
            errorMessage = 'Authentication failed. Please try logging out and back in.';
          } else if (response.status === 406) {
            console.error('[WithingsKitDevices] 406 Not Acceptable - Database access issue');
            errorMessage = 'Database permission error. Please contact support.';
          }

          console.error('[WithingsKitDevices] Error details:', result);
        } catch (parseError) {
          console.error('[WithingsKitDevices] Could not parse error response');
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate authorization URL');
      }

      console.log('[WithingsKitDevices] Force relink successful. Tokens deleted:', result.tokensDeleted);
      console.log('[WithingsKitDevices] Redirecting to Withings authorization...');
      window.location.href = result.authUrl;
    } catch (error: any) {
      console.error('[WithingsKitDevices] Error linking device:', error);
      alert(`Failed to link device: ${error.message}`);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
        console.log('Webhook notifications enabled:', result.message);
      } else {
        console.error('Failed to subscribe to notifications:', result.error);
      }
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Checking device status...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {devices.map((device, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <device.icon className={`h-5 w-5 text-${device.color}-600`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{device.name}</p>
                <p className="text-xs text-gray-500">{device.model}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {device.connectionStatus === 'Connected' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className={`text-xs font-medium ${
                device.connectionStatus === 'Connected' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {device.connectionStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Withings Device Kit</h3>
        <p className="text-sm text-gray-500 mt-1">Medical devices in your kit</p>
      </div>

      <div className="p-6 space-y-4">
        {devices.map((device, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`bg-${device.color}-100 p-3 rounded-lg`}>
                  <device.icon className={`h-6 w-6 text-${device.color}-600`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{device.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{device.model}</p>

                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-2">
                      {device.connectionStatus === 'Connected' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        device.connectionStatus === 'Connected' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {device.connectionStatus}
                      </span>
                    </div>

                    {device.lastSync && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Last sync: {device.lastSync.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {!hasConnection && device.connectionStatus === 'Disconnected' && (
                  <button
                    onClick={onLinkDevice || handleLinkDevice}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>Link Device</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!hasConnection && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Connect your Withings account to link all devices in your kit. Once connected, both devices will be available for measurements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithingsKitDevices;
