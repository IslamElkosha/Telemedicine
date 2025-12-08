import React, { useState, useEffect } from 'react';
import { Activity, Heart, Thermometer, Droplet, Link as LinkIcon, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { edgeFunctions } from '../lib/edgeFunctions';

interface WithingsStatus {
  connected: boolean;
  lastSync?: Date;
  deviceModels?: string[];
}

const WithingsConnector: React.FC = () => {
  const [status, setStatus] = useState<WithingsStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    checkForOAuthErrors();

    const { data: { subscription } } = supabase
      .channel('withings_tokens_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withings_tokens'
      }, (payload) => {
        console.log('Withings tokens changed:', payload);
        if (payload.eventType === 'DELETE') {
          setStatus({ connected: false });
          setError('Connection lost. Please reconnect your Withings device.');
        } else {
          checkConnection();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkForOAuthErrors = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    const errorDescription = urlParams.get('description');

    if (oauthError) {
      if (oauthError === 'missing_code') {
        setError('Authorization code not received from Withings');
      } else if (oauthError === 'token_exchange_failed') {
        setError('Failed to exchange authorization code for access token');
      } else if (oauthError === 'database_error') {
        setError('Failed to save tokens to database');
      } else {
        setError(errorDescription || `OAuth error: ${oauthError}`);
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('withings') === 'connected') {
      checkConnection();
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const checkConnection = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus({ connected: false });
        return;
      }

      const { data: tokenData, error, status: statusCode } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (statusCode === 406 || statusCode === 403) {
        setStatus({ connected: false });
        return;
      }

      if (error || !tokenData) {
        setStatus({ connected: false });
      } else {
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenValidForSeconds = tokenData.token_expiry_timestamp - currentTime;

        if (tokenValidForSeconds < 0) {
          console.warn('Token expired! Seconds since expiry:', Math.abs(tokenValidForSeconds));
          setStatus({ connected: false });
          setError('Connection expired. Please reconnect your Withings device.');

          await supabase
            .from('withings_tokens')
            .delete()
            .eq('user_id', session.user.id);

          return;
        }

        const { data: measurements } = await supabase
          .from('withings_measurements')
          .select('device_model, measured_at')
          .eq('user_id', session.user.id)
          .order('measured_at', { ascending: false })
          .limit(1);

        const uniqueDevices = measurements
          ? [...new Set(measurements.map(m => m.device_model))]
          : [];

        setStatus({
          connected: true,
          lastSync: measurements?.[0]?.measured_at ? new Date(measurements[0].measured_at) : undefined,
          deviceModels: uniqueDevices,
        });
      }
    } catch (err: any) {
      console.error('Error checking Withings connection:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      console.log('=== WITHINGS CONNECTION STARTED ===');
      setError(null);
      setLoading(true);

      const clientId = import.meta.env.VITE_WITHINGS_CLIENT_ID;
      console.log('[WithingsConnect] Checking Client ID:', clientId ? 'Found' : 'MISSING');

      if (!clientId) {
        console.error('Critical Error: VITE_WITHINGS_CLIENT_ID is missing in .env');
        setError('Configuration Error: Missing Withings Client ID. Please check your environment configuration.');
        setLoading(false);
        return;
      }

      console.log('[WithingsConnect] Client ID (first 20 chars):', clientId.substring(0, 20) + '...');
      console.log('[WithingsConnect] Initiating force relink to clear any expired tokens...');

      const REDIRECT_URI = import.meta.env.VITE_WITHINGS_REDIRECT_URI;
      console.log('[WithingsConnect] Using redirect URI from .env:', REDIRECT_URI);

      const result = await edgeFunctions.forceWithingsRelink(REDIRECT_URI);
      console.log('[WithingsConnect] Edge function result:', result);

      if (!result.success) {
        console.error('[WithingsConnect] Edge function failed:', result);
        throw new Error(result.error || 'Failed to generate authorization URL');
      }

      console.log('[WithingsConnect] Force relink successful. Tokens deleted:', result.tokensDeleted);
      console.log('[WithingsConnect] Authorization URL:', result.authUrl);
      console.log('[WithingsConnect] State:', result.state);

      sessionStorage.setItem('withings_auth_state', result.state);
      console.log('[WithingsConnect] State saved to sessionStorage');

      console.log('[WithingsConnect] Redirecting to Withings authorization page...');
      window.location.href = result.authUrl;
    } catch (err: any) {
      console.error('=== WITHINGS CONNECTION FAILED ===');
      console.error('[WithingsConnect] Error:', err);
      console.error('[WithingsConnect] Error message:', err.message);
      console.error('[WithingsConnect] Error stack:', err.stack);
      setError(err.message || 'Failed to connect to Withings. Please try again.');
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      console.log('Syncing measurements from Withings...');

      try {
        await edgeFunctions.withingsFetchMeasurements();
        await checkConnection();
      } catch (err: any) {
        if (err.message?.includes('token') || err.message?.includes('expired')) {
          console.log('Token expired, attempting refresh...');
          await edgeFunctions.withingsRefreshToken();
          await edgeFunctions.withingsFetchMeasurements();
          await checkConnection();
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Error syncing measurements:', err);
      setError(err.message || 'Failed to sync measurements. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('withings_tokens')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      setStatus({ connected: false });
    } catch (err: any) {
      console.error('Error disconnecting Withings:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Checking connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Withings Devices</h3>
            <p className="text-sm text-gray-500">BPM Connect & Thermo</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.connected
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {status.connected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status.connected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Blood Pressure</span>
              </div>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Thermometer className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Temperature</span>
              </div>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>

          {status.lastSync && (
            <div className="text-sm text-gray-600">
              Last synced: {status.lastSync.toLocaleString()}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              onClick={handleDisconnect}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Connect your Withings devices to automatically track blood pressure, temperature, and other vital signs.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Heart className="h-4 w-4 text-blue-600" />
              <span>BPM Connect</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Thermometer className="h-4 w-4 text-red-600" />
              <span>Thermo SCT01</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="h-4 w-4 text-green-600" />
              <span>Heart Rate</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Droplet className="h-4 w-4 text-blue-600" />
              <span>SpO2</span>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
          >
            <LinkIcon className="h-5 w-5 mr-2" />
            Connect Withings Account
          </button>
        </div>
      )}
    </div>
  );
};

export default WithingsConnector;
