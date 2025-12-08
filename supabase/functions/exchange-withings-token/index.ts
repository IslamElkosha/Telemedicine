import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=method_not_allowed' }
      });
    }

    let code: string, userId: string, redirectUri: string;

    if (req.method === 'POST') {
      const body = await req.json();
      code = body.code;
      userId = body.userId;
      redirectUri = body.redirectUri;
    } else {
      const url = new URL(req.url);
      code = url.searchParams.get('code') || '';
      userId = url.searchParams.get('userId') || '';
      redirectUri = url.searchParams.get('redirectUri') || '';
    }

    console.log('=== WITHINGS TOKEN EXCHANGE START ===');
    console.log('User ID:', userId);
    console.log('Code present:', !!code);
    console.log('Redirect URI:', redirectUri);

    if (!code || !userId || !redirectUri) {
      console.error('Missing required parameters');
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=missing_parameters' }
      });
    }

    const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID');
    const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!WITHINGS_CLIENT_ID || !WITHINGS_CLIENT_SECRET) {
      console.error('Missing Withings credentials');
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=server_configuration' }
      });
    }

    console.log('Token exchange configuration:');
    console.log('  - Token URL:', WITHINGS_TOKEN_URL);
    console.log('  - Client ID:', WITHINGS_CLIENT_ID.substring(0, 15) + '...');
    console.log('  - Redirect URI:', redirectUri);

    const params = new URLSearchParams();
    params.append('action', 'requesttoken');
    params.append('grant_type', 'authorization_code');
    params.append('client_id', WITHINGS_CLIENT_ID);
    params.append('client_secret', WITHINGS_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    console.log('Calling Withings API...');
    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('Withings API response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Withings response:', parseError);
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=invalid_withings_response' }
      });
    }

    if (tokenData.status !== 0) {
      console.error('Withings API error:', tokenData);
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=withings_api_error' }
      });
    }

    if (!tokenData.body?.access_token || !tokenData.body?.refresh_token) {
      console.error('Missing tokens in Withings response');
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=invalid_token_response' }
      });
    }

    console.log('=== TOKEN EXCHANGE SUCCESS ===');
    console.log('Access Token received:', !!tokenData.body.access_token);
    console.log('Refresh Token received:', !!tokenData.body.refresh_token);
    console.log('Withings User ID:', tokenData.body.userid);
    console.log('Expires in:', tokenData.body.expires_in);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const expiresIn = tokenData.body.expires_in || 10800;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const tokenRecord = {
      user_id: userId,
      withings_userid: tokenData.body.userid?.toString() || 'unknown',
      access_token: tokenData.body.access_token,
      refresh_token: tokenData.body.refresh_token,
      expires_at: expiresAt,
      expires_in: expiresIn,
      scope: tokenData.body.scope || '',
    };

    console.log('=== SAVING TO DATABASE ===');
    console.log('User ID:', userId);
    console.log('Withings User ID:', tokenRecord.withings_userid);
    console.log('Expires at:', expiresAt);

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('withings_tokens')
      .upsert(tokenRecord, { onConflict: 'user_id' })
      .select();

    if (dbError) {
      console.error('=== DATABASE ERROR ===');
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      console.error('Error details:', dbError.details);
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=database_error' }
      });
    }

    console.log('=== DATABASE SAVE SUCCESS ===');
    console.log('Saved record:', insertData);
    console.log('=== TOKEN EXCHANGE COMPLETE ===');

    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, 'Location': '/?success=device_linked' }
    });
  } catch (error: any) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, 'Location': '/?error=linking_failed' }
    });
  }
});