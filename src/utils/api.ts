import { supabase } from '../lib/supabase';

/**
 * A wrapper to call Supabase Edge Functions with automatic Auth Injection.
 * This fixes the 401 Unauthorized error by guaranteeing a fresh JWT.
 */
export async function callEdgeFunction(functionName: string, method: string = 'GET', body: any = null) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error("[API] No active session. Redirecting to login...");
    window.location.href = '/';
    throw new Error("Authentication required. Please log in.");
  }

  const token = session.access_token;
  console.log(`[API] Calling ${functionName} with token: ${token.substring(0, 10)}...`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] ${functionName} Failed: ${response.status} - ${errorText}`);
    throw new Error(`Server Error: ${errorText}`);
  }

  return response.json();
}
