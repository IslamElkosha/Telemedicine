import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwlommrclqhpvthqxcge.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bG9tbXJjbHFocHZ0aHF4Y2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NjMwMzYsImV4cCI6MjA3NTUzOTAzNn0.w2Fpmdd31YXV_k4Q9yShBx_iFOZ5LWSuVG3mpeqNQdk';

console.log('[Supabase] Initializing client with hardcoded credentials:', {
  url: supabaseUrl,
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
  storageType: 'localStorage',
  persistSession: true
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    storageKey: 'telemedicine-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  },
  global: {
    headers: {
      apikey: supabaseAnonKey
    }
  },
  db: {
    schema: 'public'
  }
});

console.log('[Supabase] Client initialized successfully with enhanced persistence');

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
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
