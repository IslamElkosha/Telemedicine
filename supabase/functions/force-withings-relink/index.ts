import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step 1: Creating User Client for authentication verification');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    console.log('Step 2: Creating Admin Client for database operations');
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Step 3: Deleting expired/invalid tokens from database');
    const { error: deleteError, data: deletedData } = await adminClient
      .from('withings_tokens')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (deleteError) {
      console.error('Error deleting tokens:', deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete tokens: ${deleteError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tokens deleted successfully:', deletedData?.length || 0, 'records');

    console.log('Step 2: Generating fresh OAuth authorization URL');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-withings-callback`;
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

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process relink request'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});