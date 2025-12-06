import { supabase } from '../lib/supabase';

/**
 * Centralized API utility with Refresh-Then-Fetch pattern.
 * Implements Supabase diagnostic instructions to prevent 401 errors.
 *
 * Flow:
 * 1. Force refresh session to ensure token is not expired
 * 2. Get fresh session
 * 3. Validate session exists
 * 4. Extract access_token (DO NOT use anon key for Authorization)
 * 5. Debug log token (first 20 chars)
 * 6. Make request with strict header format
 */
export async function callEdgeFunction(functionName: string, method: string = 'GET', body: any = null) {
  console.log(`[API] === Starting callEdgeFunction for ${functionName} ===`);

  console.log('[API] Step 1: Force refreshing session...');
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    console.error('[API] Session refresh failed:', refreshError.message);
  } else {
    console.log('[API] Session refresh successful');
  }

  console.log('[API] Step 2: Getting current session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[API] Session error:', sessionError.message);
    console.error('[API] No active session. Redirecting to login...');
    window.location.href = '/';
    throw new Error('No active session');
  }

  if (!session) {
    console.error('[API] No active session found. Redirecting to login...');
    window.location.href = '/';
    throw new Error('No active session');
  }

  console.log('[API] Step 3: Validating session...');
  console.log('[API] User ID:', session.user.id);
  console.log('[API] Session expires at:', new Date(session.expires_at! * 1000).toISOString());

  console.log('[API] Step 4: Extracting access token...');
  const token = session.access_token;

  if (!token) {
    console.error('[API] No access token in session');
    throw new Error('No access token available');
  }

  console.log('[API] Step 5: Debug - Token used:', token.slice(0, 20) + '...');

  console.log('[API] Step 6: Constructing headers...');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  console.log('[API] Headers constructed:', {
    hasAuthorization: !!headers.Authorization,
    hasContentType: !!headers['Content-Type'],
    hasApikey: !!headers.apikey,
  });

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  console.log('[API] Step 7: Making fetch request...');
  console.log('[API] URL:', url);
  console.log('[API] Method:', method);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log('[API] Response status:', response.status, response.statusText);

  if (!response.ok) {
    let errorText: string;
    try {
      errorText = await response.text();
      console.error(`[API] ${functionName} Failed (${response.status}):`, errorText);
    } catch (e) {
      errorText = 'Unable to parse error response';
      console.error(`[API] ${functionName} Failed (${response.status}): Unable to read response`);
    }
    throw new Error(`Server Error (${response.status}): ${errorText}`);
  }

  console.log('[API] Request successful, parsing JSON...');
  const data = await response.json();
  console.log('[API] === callEdgeFunction complete for ${functionName} ===');

  return data;
}
