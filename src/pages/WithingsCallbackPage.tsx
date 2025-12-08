import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const WithingsCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Withings authorization...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      console.log('[WithingsCallback] === CALLBACK STARTED ===');
      console.log('[WithingsCallback] URL:', window.location.href);

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      console.log('[WithingsCallback] Code present:', !!code);
      console.log('[WithingsCallback] State present:', !!state);
      console.log('[WithingsCallback] Error param:', error);

      if (error) {
        throw new Error(`Withings authorization failed: ${error}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      const savedState = sessionStorage.getItem('withings_auth_state');
      console.log('[WithingsCallback] Saved state matches:', savedState === state);

      if (!savedState || savedState !== state) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      sessionStorage.removeItem('withings_auth_state');

      setMessage('Restoring session...');

      console.log('[WithingsCallback] Getting session and refreshing if needed...');
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        console.error('[WithingsCallback] No session in localStorage');
        throw new Error('Session expired. Please log in and try connecting again.');
      }

      const expiresAt = currentSession.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      console.log('[WithingsCallback] Token expires in:', timeUntilExpiry, 'seconds');

      let session = currentSession;

      if (timeUntilExpiry < 300) {
        console.log('[WithingsCallback] Token expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('[WithingsCallback] Refresh failed:', refreshError);
          throw new Error('Session expired. Please log in and try connecting again.');
        }

        session = refreshedSession;
        console.log('[WithingsCallback] Session refreshed successfully');
      } else {
        console.log('[WithingsCallback] Token still valid, using current session');
      }

      console.log('[WithingsCallback] Using session for user:', session.user.id);

      setMessage('Exchanging authorization code for access tokens...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/exchange-withings-token`;
      const redirectUri = import.meta.env.VITE_WITHINGS_REDIRECT_URI;

      console.log('[WithingsCallback] Calling edge function:', functionUrl);
      console.log('[WithingsCallback] User ID:', session.user.id);
      console.log('[WithingsCallback] Redirect URI:', redirectUri);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          code,
          userId: session.user.id,
          redirectUri
        }),
      });

      console.log('[WithingsCallback] Response status:', response.status);
      console.log('[WithingsCallback] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WithingsCallback] HTTP Error Response:', errorText);
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
          console.error('[WithingsCallback] Parsed error:', parsedError);
        } catch (e) {
          console.error('[WithingsCallback] Could not parse error response');
        }
        throw new Error(`Token exchange failed (${response.status}): ${parsedError?.error || errorText}`);
      }

      const result = await response.json();
      console.log('[WithingsCallback] Result:', result);

      if (!result.success) {
        const errorDetails = result.code ? `[${result.code}] ` : '';
        const errorHint = result.hint ? ` Hint: ${result.hint}` : '';
        const errorMessage = `${errorDetails}${result.error || 'Failed to link Withings account'}${errorHint}`;
        console.error('[WithingsCallback] Exchange failed:', errorMessage);
        throw new Error(errorMessage);
      }

      setStatus('success');
      setMessage('Withings account linked successfully!');

      setTimeout(() => {
        navigate('/patient/devices');
      }, 2000);
    } catch (error: any) {
      console.error('[WithingsCallback] Error:', error);
      console.error('[WithingsCallback] Error stack:', error.stack);
      setStatus('error');
      setMessage(error.message || 'Failed to link Withings account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-4">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-900">Processing</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Success!</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to devices page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-red-100 rounded-full p-3">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Connection Failed</h2>
              <p className="text-gray-600 text-sm break-words">{message}</p>
              <button
                onClick={() => navigate('/patient/devices')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Devices
              </button>
              <p className="text-xs text-gray-500 mt-2">Check the browser console for detailed logs</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithingsCallbackPage;
