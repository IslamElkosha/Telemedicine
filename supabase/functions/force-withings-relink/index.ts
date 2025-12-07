import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, cache-control, pragma',
};

const WITHINGS_CLIENT_ID = '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
const WITHINGS_AUTH_URL = 'https://account.withings.com/oauth2_user/authorize2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== FORCE WITHINGS RELINK INITIATED ===');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      throw new Error('Invalid token');
    }

    console.log('User authenticated:', user.id);

    console.log('Step 1: Deleting expired/invalid tokens from database');
    const { error: deleteError, data: deletedData } = await supabase
      .from('withings_tokens')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (deleteError) {
      console.error('Error deleting tokens:', deleteError);
      throw new Error(`Failed to delete tokens: ${deleteError.message}`);
    }

    console.log('Tokens deleted successfully:', deletedData?.length || 0, 'records');

    console.log('Step 2: Generating fresh OAuth authorization URL');
    const redirectUri = `${supabaseUrl}/functions/v1/handle-withings-callback`;
    const scope = 'user.metrics,user.info';
    const state = user.id;

    const authUrl = new URL(WITHINGS_AUTH_URL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', WITHINGS_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scope);

    console.log('OAuth URL generated:', authUrl.toString());
    console.log('=== FORCE RELINK COMPLETE - REDIRECTING USER ===');

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl.toString(),
        message: 'Expired tokens cleared. Please authorize again.',
        tokensDeleted: deletedData?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== ERROR IN FORCE RELINK ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    const statusCode = error.message.includes('Authorization') || error.message.includes('token') ? 401 : 500;

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});