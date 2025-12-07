import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_CLIENT_ID = '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
const WITHINGS_AUTH_URL = 'https://account.withings.com/oauth2_user/authorize2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== FORCE WITHINGS RELINK INITIATED ===');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    } else {
      console.log('Tokens deleted successfully:', deletedData?.length || 0, 'records');
    }

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
    console.error('Error in force relink:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
