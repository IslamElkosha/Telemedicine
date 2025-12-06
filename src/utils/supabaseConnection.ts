import { supabase } from '../lib/supabase';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: {
    url: string;
    authenticated: boolean;
    userId?: string;
  };
}> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        success: false,
        message: `Session error: ${sessionError.message}`,
      };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Database connection error: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase',
      details: {
        url: import.meta.env.VITE_SUPABASE_URL,
        authenticated: !!session,
        userId: session?.user?.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function ensureAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
