import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
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
    console.log('[Edge Function] Authorization header present:', !!authHeader);

    if (!authHeader) {
      console.error('[Edge Function] Missing Authorization header');
      return new Response(
        JSON.stringify({
          error: 'Missing authorization header',
          details: 'Authorization header with Bearer token is required'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] Auth header value (first 20 chars):', authHeader.slice(0, 20) + '...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[Edge Function] Creating service role client (for delete operation)...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('[Edge Function] Verifying user identity...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[Edge Function] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: authError?.message || 'Invalid or expired token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] Authenticated user:', user.id);

    console.log('[Edge Function] Step 1: Deleting expired/invalid tokens from database...');
    const { error: deleteError, data: deletedData } = await supabaseAdmin
      .from('withings_tokens')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (deleteError) {
      console.error('[Edge Function] Error deleting tokens:', deleteError.message);
    } else {
      console.log('[Edge Function] Tokens deleted successfully:', deletedData?.length || 0, 'records');
    }

    console.log('[Edge Function] Step 2: Generating fresh OAuth authorization URL...');
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