import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getValidSession } from '../utils/authHelper';

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
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        throw new Error(`Withings authorization failed: ${error}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      const savedState = sessionStorage.getItem('withings_auth_state');

      if (!savedState || savedState !== state) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      sessionStorage.removeItem('withings_auth_state');

      const session = await getValidSession(false);

      if (!session) {
        throw new Error('No valid session found');
      }

      setMessage('Exchanging authorization code for access tokens...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/exchange-withings-token`;

      const redirectUri = `${window.location.origin}/withings-callback`;

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to link Withings account');
      }

      setStatus('success');
      setMessage('Withings account linked successfully!');

      setTimeout(() => {
        navigate('/patient/devices');
      }, 2000);
    } catch (error: any) {
      console.error('[WithingsCallback] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to link Withings account');

      setTimeout(() => {
        navigate('/patient/devices');
      }, 3000);
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
              <h2 className="text-xl font-semibold text-gray-900">Error</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting back to devices page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithingsCallbackPage;
