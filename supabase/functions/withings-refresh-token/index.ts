import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_TOKEN_PATH = '/v2/oauth2';
const WITHINGS_TOKEN_URL = WITHINGS_API_BASE + WITHINGS_TOKEN_PATH;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID') || '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
    const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET') || '215903021c01d0fcd509c5013cf48b7f8637f887ca31f930e8bf5f8ec51fd034';

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No Withings connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Refreshing token for user:', user.id);

    const refreshParams = new URLSearchParams();
    refreshParams.append('action', 'requesttoken');
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('client_id', WITHINGS_CLIENT_ID);
    refreshParams.append('client_secret', WITHINGS_CLIENT_SECRET);
    refreshParams.append('refresh_token', tokenData.refresh_token);

    console.log('Sending refresh request to:', WITHINGS_TOKEN_URL);
    console.log('Refresh parameters:', {
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET.substring(0, 10) + '...',
      refresh_token: tokenData.refresh_token.substring(0, 20) + '...',
    });
    const refreshResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });

    const refreshData = await refreshResponse.json();
    console.log('Refresh response status:', refreshData.status);

    if (refreshData.status !== 0) {
      console.error('Withings refresh error:', refreshData);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token', details: refreshData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresIn = refreshData.body.expires_in || 10800;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('withings_tokens')
      .update({
        access_token: refreshData.body.access_token,
        refresh_token: refreshData.body.refresh_token,
        expires_at: expiresAt,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tokens', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token refreshed successfully for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Token refreshed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});