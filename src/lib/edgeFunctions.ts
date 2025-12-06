import { supabase } from './supabase';

interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  requiresAuth?: boolean;
}

interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export async function callEdgeFunction<T = any>(
  functionName: string,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse<T>> {
  const {
    method = 'POST',
    body = null,
    requiresAuth = true,
  } = options;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[EdgeFunction] Missing environment variables');
      return {
        success: false,
        error: 'Configuration error: Missing Supabase credentials',
      };
    }

    let accessToken: string | undefined;

    if (requiresAuth) {
      console.log(`[EdgeFunction] Getting fresh session for ${functionName}...`);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[EdgeFunction] Session error:', sessionError);
        console.error('[EdgeFunction] Attempting to refresh session...');

        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('[EdgeFunction] Session refresh failed:', refreshError);

          window.location.href = '/';

          return {
            success: false,
            error: 'Session expired. Please log in again.',
          };
        }

        accessToken = refreshedSession.access_token;
        console.log(`[EdgeFunction] Session refreshed successfully for ${functionName}`);
      } else if (!session || !session.access_token) {
        console.error('[EdgeFunction] No active session found');

        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error('[EdgeFunction] No valid session available. Redirecting to login...');

          window.location.href = '/';

          return {
            success: false,
            error: 'Please log in to continue.',
          };
        }

        accessToken = refreshedSession.access_token;
        console.log(`[EdgeFunction] New session obtained for ${functionName}`);
      } else {
        accessToken = session.access_token;
        console.log(`[EdgeFunction] Using existing valid session for ${functionName} (user: ${session.user.id})`);
        console.log(`[EdgeFunction] Token preview: ${accessToken.substring(0, 20)}...`);
      }
    } else {
      console.log(`[EdgeFunction] Calling ${functionName} without authentication`);
    }

    const headers: Record<string, string> = {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const cacheBuster = Date.now();
    const url = `${supabaseUrl}/functions/v1/${functionName}?_t=${cacheBuster}`;

    console.log(`[EdgeFunction] Request URL: ${url}`);
    console.log(`[EdgeFunction] Method: ${method}`);
    console.log(`[EdgeFunction] Headers:`, {
      hasAuth: !!headers['Authorization'],
      hasApikey: !!headers['apikey'],
      hasAccept: !!headers['Accept'],
      hasCacheControl: !!headers['Cache-Control'],
      hasPragma: !!headers['Pragma'],
    });

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    console.log(`[EdgeFunction] Response status: ${response.status}`);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
        console.error(`[EdgeFunction] Error response:`, errorData);
      } catch (parseError) {
        console.error(`[EdgeFunction] Could not parse error response`);
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      return {
        success: false,
        error: errorData.error || errorData.message || `Request failed with status ${response.status}`,
        details: errorData.details || errorData.debugInfo,
      };
    }

    const data = await response.json();
    console.log(`[EdgeFunction] Success response:`, data);

    return {
      success: true,
      data: data,
    };
  } catch (error: any) {
    console.error(`[EdgeFunction] Unexpected error calling ${functionName}:`, error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: `Network error: ${error.message}. This could be a CORS issue or connection problem.`,
      };
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export const edgeFunctions = {
  startWithingsAuth: () => callEdgeFunction('start-withings-auth', { method: 'POST' }),

  forceWithingsRelink: () => callEdgeFunction('force-withings-relink', { method: 'POST' }),

  handleWithingsCallback: (code: string, state: string) =>
    callEdgeFunction('handle-withings-callback', {
      method: 'POST',
      body: { code, state },
    }),

  fetchLatestBPReading: () => callEdgeFunction('fetch-latest-bp-reading', { method: 'GET' }),

  fetchLatestThermoData: () => callEdgeFunction('fetch-latest-thermo-data', { method: 'GET' }),

  withingsFetchMeasurements: () =>
    callEdgeFunction('withings-fetch-measurements', { method: 'POST' }),

  withingsRefreshToken: () =>
    callEdgeFunction('withings-refresh-token', { method: 'POST' }),

  subscribeWithingsNotify: () =>
    callEdgeFunction('subscribe-withings-notify', { method: 'POST' }),

  debugWithingsDataPull: () =>
    callEdgeFunction('debug-withings-data-pull', { method: 'POST' }),
};
