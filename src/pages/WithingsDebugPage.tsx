import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function WithingsDebugPage() {
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Session Check', status: 'pending', message: 'Waiting...' },
    { name: 'Environment Variables', status: 'pending', message: 'Waiting...' },
    { name: 'Database Connection', status: 'pending', message: 'Waiting...' },
    { name: 'RLS Policies', status: 'pending', message: 'Waiting...' },
    { name: 'Edge Function Connectivity', status: 'pending', message: 'Waiting...' },
    { name: 'OAuth Callback (if code present)', status: 'pending', message: 'Waiting...' },
  ]);
  const [running, setRunning] = useState(false);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  const runTests = async () => {
    setRunning(true);

    updateTest(0, { status: 'running', message: 'Checking session...' });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        updateTest(0, { status: 'error', message: 'No active session', details: { error: 'User not logged in' } });
      } else {
        updateTest(0, { status: 'success', message: `Session active: ${session.user.id}`, details: session });
      }
    } catch (error: any) {
      updateTest(0, { status: 'error', message: error.message, details: error });
    }

    updateTest(1, { status: 'running', message: 'Checking environment...' });
    try {
      const clientId = import.meta.env.VITE_WITHINGS_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_WITHINGS_REDIRECT_URI;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const missing = [];
      if (!clientId) missing.push('VITE_WITHINGS_CLIENT_ID');
      if (!redirectUri) missing.push('VITE_WITHINGS_REDIRECT_URI');
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
      if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');

      if (missing.length > 0) {
        updateTest(1, {
          status: 'error',
          message: `Missing: ${missing.join(', ')}`,
          details: { missing, clientId: clientId?.substring(0, 20) }
        });
      } else {
        updateTest(1, {
          status: 'success',
          message: 'All required env vars present',
          details: {
            clientId: clientId.substring(0, 20) + '...',
            redirectUri,
            supabaseUrl
          }
        });
      }
    } catch (error: any) {
      updateTest(1, { status: 'error', message: error.message });
    }

    updateTest(2, { status: 'running', message: 'Testing database...' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        updateTest(2, { status: 'error', message: 'No session for DB test' });
      } else {
        const { data, error, status: statusCode } = await supabase
          .from('withings_tokens')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          updateTest(2, {
            status: 'error',
            message: `Query failed: ${error.message}`,
            details: { error, statusCode }
          });
        } else {
          updateTest(2, {
            status: 'success',
            message: data ? 'Token found in DB' : 'No token (expected for new user)',
            details: { data, statusCode }
          });
        }
      }
    } catch (error: any) {
      updateTest(2, { status: 'error', message: error.message, details: error });
    }

    updateTest(3, { status: 'running', message: 'Testing RLS...' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        updateTest(3, { status: 'error', message: 'No session for RLS test' });
      } else {
        const testToken = {
          user_id: session.user.id,
          access_token: 'test_access_token_12345',
          refresh_token: 'test_refresh_token_67890',
          expires_in: 10800,
          scope: 'test',
          withings_userid: 'test_user_123'
        };

        const { error: insertError } = await supabase
          .from('withings_tokens')
          .upsert(testToken, { onConflict: 'user_id' });

        if (insertError) {
          updateTest(3, {
            status: 'error',
            message: `RLS blocked insert: ${insertError.message}`,
            details: { error: insertError, testToken }
          });
        } else {
          const { error: deleteError } = await supabase
            .from('withings_tokens')
            .delete()
            .eq('user_id', session.user.id)
            .eq('access_token', 'test_access_token_12345');

          if (deleteError) {
            updateTest(3, {
              status: 'error',
              message: `RLS blocked delete: ${deleteError.message}`,
              details: deleteError
            });
          } else {
            updateTest(3, {
              status: 'success',
              message: 'RLS allows insert/delete',
              details: 'Test token inserted and deleted successfully'
            });
          }
        }
      }
    } catch (error: any) {
      updateTest(3, { status: 'error', message: error.message, details: error });
    }

    updateTest(4, { status: 'running', message: 'Testing edge function...' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        updateTest(4, { status: 'error', message: 'No session for edge function test' });
      } else {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const functionUrl = `${supabaseUrl}/functions/v1/force-withings-relink`;

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            redirectUri: import.meta.env.VITE_WITHINGS_REDIRECT_URI
          })
        });

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = responseText;
        }

        if (!response.ok) {
          updateTest(4, {
            status: 'error',
            message: `Edge function failed (${response.status})`,
            details: { status: response.status, response: result }
          });
        } else {
          updateTest(4, {
            status: 'success',
            message: 'Edge function reachable',
            details: result
          });
        }
      }
    } catch (error: any) {
      updateTest(4, { status: 'error', message: error.message, details: error });
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code) {
      updateTest(5, { status: 'running', message: 'Testing token exchange...' });
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          updateTest(5, { status: 'error', message: 'No session for token exchange' });
        } else {
          const savedState = sessionStorage.getItem('withings_auth_state');

          if (savedState !== state) {
            updateTest(5, {
              status: 'error',
              message: 'State mismatch',
              details: { savedState, receivedState: state }
            });
          } else {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${supabaseUrl}/functions/v1/exchange-withings-token`;

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
                redirectUri: import.meta.env.VITE_WITHINGS_REDIRECT_URI
              })
            });

            const responseText = await response.text();
            let result;
            try {
              result = JSON.parse(responseText);
            } catch {
              result = responseText;
            }

            if (!response.ok) {
              updateTest(5, {
                status: 'error',
                message: `Token exchange failed (${response.status})`,
                details: { status: response.status, response: result }
              });
            } else if (result.success) {
              updateTest(5, {
                status: 'success',
                message: 'Token exchange successful!',
                details: result
              });
            } else {
              updateTest(5, {
                status: 'error',
                message: result.error || 'Unknown error',
                details: result
              });
            }
          }
        }
      } catch (error: any) {
        updateTest(5, { status: 'error', message: error.message, details: error });
      }
    } else {
      updateTest(5, { status: 'pending', message: 'No OAuth code present (navigate from Withings to test)' });
    }

    setRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full bg-gray-200" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Withings Integration Diagnostics</h1>
              <p className="text-gray-600 mt-1">Testing all components of the OAuth flow</p>
            </div>
            <button
              onClick={runTests}
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : 'Run Tests'}
            </button>
          </div>

          {searchParams.get('code') && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">OAuth Code Detected</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This page was loaded from a Withings redirect. Test #6 will attempt token exchange.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg border-2 p-4 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-start">
                {getStatusIcon(test.status)}
                <div className="ml-3 flex-1">
                  <h3 className="font-semibold text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-700 mt-1">{test.message}</p>
                  {test.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Use This Tool</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Run the tests on this page to check your basic setup</li>
            <li>If tests 1-4 pass, click "Connect Withings" on your devices page</li>
            <li>Authorize with Withings</li>
            <li>When redirected back, change the URL from <code className="bg-gray-100 px-1 rounded">/withings-callback</code> to <code className="bg-gray-100 px-1 rounded">/withings-debug</code> (keep the query parameters)</li>
            <li>Test #6 will attempt the token exchange and show detailed errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
