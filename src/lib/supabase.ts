import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwlommrclqhpvthqxcge.supabase.co';
const supabaseKey = 'sb_publishable_MvxfTrIGw_nLPpfnQZvsDg_Jk5Yp_js';

console.log('[Supabase] Initializing with provided sb_publishable key...');
console.log('[Supabase] Configuration:', {
  url: supabaseUrl,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  keyPrefix: supabaseKey?.substring(0, 20) + '...',
  storageType: 'localStorage',
  persistSession: true
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'telemedicine-auth',
    flowType: 'implicit'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  },
  global: {
    headers: {
      apikey: supabaseKey
    }
  },
  db: {
    schema: 'public'
  }
});

console.log('[Supabase] Client initialized successfully with sb_publishable key');

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function callEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge function ${functionName} failed: ${error}`);
  }

  return response.json();
}
