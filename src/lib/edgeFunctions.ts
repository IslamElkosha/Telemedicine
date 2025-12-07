import { supabase } from './supabase';

/**
 * Unified helper for invoking Supabase Edge Functions with strict auth handling.
 *
 * This function:
 * 1. Always fetches a fresh session before calling
 * 2. Explicitly injects the Authorization header
 * 3. Uses Supabase's built-in functions.invoke() method
 * 4. Handles session expiration and auth errors
 *
 * @param functionName - The name of the edge function to invoke
 * @param body - Optional request body (defaults to empty object)
 * @returns The response data from the edge function
 * @throws Error if authentication fails or the function returns an error
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: any = {}
): Promise<T> {
  console.log(`[EdgeFn] Calling ${functionName}...`);

  console.log(`[EdgeFn] Refreshing session to ensure valid token...`);
  const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

  if (sessionError || !session) {
    console.error(`[EdgeFn] Authentication required: No active session.`, sessionError);
    throw new Error("Authentication required: Please log in again.");
  }

  console.log(`[EdgeFn] Authenticated as User: ${session.user.id}`);
  console.log(`[EdgeFn] Fresh token obtained, preview: ${session.access_token.substring(0, 20)}...`);

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    }
  });

  if (error) {
    console.error(`[EdgeFn] Error in ${functionName}:`, error);

    if (error.context?.status === 401 || error.message?.includes("Invalid JWT") || error.message?.includes("JWT")) {
      console.error(`[EdgeFn] JWT error detected. Session may be expired.`);
      throw new Error("Session expired. Please refresh or log in again.");
    }

    throw new Error(error.message || `Edge function ${functionName} failed`);
  }

  console.log(`[EdgeFn] ${functionName} completed successfully`);
  return data as T;
}

export const edgeFunctions = {
  startWithingsAuth: () => invokeEdgeFunction('start-withings-auth'),

  forceWithingsRelink: () => invokeEdgeFunction('force-withings-relink'),

  handleWithingsCallback: (code: string, state: string) =>
    invokeEdgeFunction('handle-withings-callback', { code, state }),

  fetchLatestBPReading: () => invokeEdgeFunction('fetch-latest-bp-reading'),

  fetchLatestThermoData: () => invokeEdgeFunction('fetch-latest-thermo-data'),

  withingsFetchMeasurements: () =>
    invokeEdgeFunction('withings-fetch-measurements'),

  withingsRefreshToken: () =>
    invokeEdgeFunction('withings-refresh-token'),

  subscribeWithingsNotify: () =>
    invokeEdgeFunction('subscribe-withings-notify'),

  debugWithingsDataPull: () =>
    invokeEdgeFunction('debug-withings-data-pull'),
};
