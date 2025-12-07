import React, { useState } from 'react';
import { AlertCircle, Activity, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

const WithingsDebugger: React.FC = () => {
  const [bpResponse, setBpResponse] = useState<string>('');
  const [bpLoading, setBpLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(false);

  const testBPFetch = async () => {
    try {
      setBpLoading(true);
      setBpResponse('');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setBpResponse('ERROR: No active session found');
        return;
      }

      const authHeader = `Bearer ${session.access_token}`;
      console.log('=== BP FETCH TEST ===');
      console.log('Authorization Header:', authHeader);
      console.log('User ID:', session.user.id);
      console.log('Access Token (first 50 chars):', session.access_token.substring(0, 50) + '...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/fetch-latest-bp-reading`;

      console.log('Calling Edge Function:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      console.log('Response Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('Response Body:', responseText);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = responseText;
      }

      setBpResponse(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        body: parsedResponse
      }, null, 2));

    } catch (error: any) {
      console.error('BP Fetch Error:', error);
      setBpResponse(`ERROR: ${error.message}\n\nStack: ${error.stack}`);
    } finally {
      setBpLoading(false);
    }
  };

  const checkTokenStatus = async () => {
    try {
      setTokenLoading(true);
      setTokenStatus('');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setTokenStatus('ERROR: No active session found');
        return;
      }

      console.log('=== TOKEN STATUS CHECK ===');
      console.log('User ID:', session.user.id);

      const { data, error, status: statusCode } = await supabase
        .from('withings_tokens')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      console.log('Query Status Code:', statusCode);
      console.log('Query Error:', error);
      console.log('Query Data:', data);

      if (error) {
        setTokenStatus(JSON.stringify({
          status: 'ERROR',
          statusCode: statusCode,
          error: error,
          message: error.message
        }, null, 2));
        return;
      }

      if (data) {
        const currentTime = Math.floor(Date.now() / 1000);
        const expiresIn = data.token_expiry_timestamp - currentTime;
        const expiresInHours = Math.floor(expiresIn / 3600);
        const expiresInMinutes = Math.floor((expiresIn % 3600) / 60);

        setTokenStatus(JSON.stringify({
          status: 'TOKEN FOUND',
          userId: data.user_id,
          withingsUserId: data.withings_user_id,
          tokenExpiryTimestamp: data.token_expiry_timestamp,
          currentTimestamp: currentTime,
          expiresIn: `${expiresInHours}h ${expiresInMinutes}m`,
          isExpired: expiresIn < 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          accessTokenLength: data.access_token?.length || 0,
          refreshTokenLength: data.refresh_token?.length || 0
        }, null, 2));
      } else {
        setTokenStatus(JSON.stringify({
          status: 'NO TOKEN FOUND',
          message: 'No Withings token exists for this user'
        }, null, 2));
      }

    } catch (error: any) {
      console.error('Token Check Error:', error);
      setTokenStatus(`ERROR: ${error.message}\n\nStack: ${error.stack}`);
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-6 w-6 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-900">Withings Debug Panel</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <button
            onClick={checkTokenStatus}
            disabled={tokenLoading}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="h-5 w-5" />
            <span>{tokenLoading ? 'Checking...' : 'Check Token Status'}</span>
          </button>

          {tokenStatus && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Token Status Result:</h4>
              <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border border-gray-200">
                {tokenStatus}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={testBPFetch}
            disabled={bpLoading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity className="h-5 w-5" />
            <span>{bpLoading ? 'Fetching...' : 'Test BP Fetch'}</span>
          </button>

          {bpResponse && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">BP Fetch Result:</h4>
              <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border border-gray-200">
                {bpResponse}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
        <p className="text-xs text-yellow-800">
          <strong>Debug Info:</strong> Check your browser console for detailed logs including authorization headers and full request/response data.
        </p>
      </div>
    </div>
  );
};

export default WithingsDebugger;
