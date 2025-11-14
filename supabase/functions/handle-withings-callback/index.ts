import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_TOKEN_PATH = '/oauth2/token';
const WITHINGS_TOKEN_URL = WITHINGS_API_BASE + WITHINGS_TOKEN_PATH;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('=== WITHINGS OAUTH CALLBACK START ===');
    console.log('Callback URL:', req.url);
    console.log('Code present:', !!code);
    console.log('State (user_id):', state);
    console.log('Error:', error);

    if (error) {
      console.error('OAuth error from Withings:', error, errorDescription);
      const redirectUrl = `${url.origin}/patient/devices?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!code) {
      console.error('Missing authorization code in callback');
      const redirectUrl = `${url.origin}/patient/devices?error=missing_code`;
      return Response.redirect(redirectUrl, 302);
    }

    const userId = state;
    if (!userId) {
      console.error('Missing state parameter (user_id)');
      const redirectUrl = `${url.origin}/patient/devices?error=missing_state`;
      return Response.redirect(redirectUrl, 302);
    }

    const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID') || '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
    const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET') || '215903021c01d0fcd509c5013cf48b7f8637f887ca31f930e8bf5f8ec51fd034';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${supabaseUrl}/functions/v1/handle-withings-callback`;

    console.log('Token exchange configuration:');
    console.log('  - Token URL:', WITHINGS_TOKEN_URL);
    console.log('  - Client ID:', WITHINGS_CLIENT_ID.substring(0, 15) + '...');
    console.log('  - Redirect URI:', redirectUri);
    console.log('  - User ID:', userId);

    const tokenRequestBody = {
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    };

    const formBody = new URLSearchParams(tokenRequestBody);

    console.log('Sending token exchange request to Withings...');
    const tokenResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    console.log('Token response HTTP status:', tokenResponse.status, tokenResponse.statusText);
    const responseText = await tokenResponse.text();
    console.log('Token response body (raw):', responseText);

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
      console.log('Token response parsed successfully');
      console.log('Token data status:', tokenData.status);
    } catch (parseError) {
      console.error('Failed to parse token response as JSON:', parseError);
      const redirectUrl = `${url.origin}/patient/devices?error=invalid_response_format`;
      return Response.redirect(redirectUrl, 302);
    }

    if (tokenData.status !== 0) {
      console.error('Withings token exchange failed with status:', tokenData.status);
      console.error('Error details:', {
        status: tokenData.status,
        error: tokenData.error,
        message: tokenData.message || 'Unknown error'
      });
      const redirectUrl = `${url.origin}/patient/devices?error=token_exchange_failed&status=${tokenData.status}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!tokenData.body) {
      console.error('Token response missing body:', tokenData);
      const redirectUrl = `${url.origin}/patient/devices?error=invalid_token_response`;
      return Response.redirect(redirectUrl, 302);
    }

    console.log('=== TOKEN EXCHANGE SUCCESS ===');
    console.log('Access Token (first 30 chars):', tokenData.body.access_token?.substring(0, 30) + '...');
    console.log('Refresh Token (first 30 chars):', tokenData.body.refresh_token?.substring(0, 30) + '...');
    console.log('Withings User ID:', tokenData.body.userid);
    console.log('Token Expires In (seconds):', tokenData.body.expires_in);
    console.log('Token Scope:', tokenData.body.scope);

    if (!tokenData.body.access_token || !tokenData.body.refresh_token) {
      console.error('Missing access_token or refresh_token in response body');
      const redirectUrl = `${url.origin}/patient/devices?error=missing_tokens`;
      return Response.redirect(redirectUrl, 302);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresIn = tokenData.body.expires_in || 10800;
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

    const tokenRecord = {
      user_id: userId,
      withings_user_id: tokenData.body.userid?.toString() || 'unknown',
      access_token: tokenData.body.access_token,
      refresh_token: tokenData.body.refresh_token,
      token_expiry_timestamp: expiryTimestamp,
    };

    console.log('=== SAVING TO DATABASE ===');
    console.log('User ID:', userId);
    console.log('Withings User ID:', tokenRecord.withings_user_id);
    console.log('Token Expiry Timestamp:', expiryTimestamp, '(', new Date(expiryTimestamp * 1000).toISOString(), ')');

    const { data: insertData, error: dbError } = await supabase
      .from('withings_tokens')
      .upsert(tokenRecord, { onConflict: 'user_id' })
      .select();

    if (dbError) {
      console.error('=== DATABASE ERROR ===');
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      console.error('Error details:', dbError.details);
      console.error('Error hint:', dbError.hint);
      const redirectUrl = `${url.origin}/patient/devices?error=database_error&details=${encodeURIComponent(dbError.message)}`;
      return Response.redirect(redirectUrl, 302);
    }

    console.log('=== DATABASE SAVE SUCCESS ===');
    console.log('Saved record:', insertData);
    console.log('Record count:', insertData?.length || 0);

    setTimeout(() => {
      (async () => {
        try {
          console.log('Triggering initial measurement sync...');
          const syncUrl = `${supabaseUrl}/functions/v1/withings-fetch-measurements`;
          const syncResponse = await fetch(syncUrl, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
          });
          const syncResult = await syncResponse.json();
          console.log('Initial sync result:', syncResult);
        } catch (syncError) {
          console.error('Initial sync error (non-critical):', syncError);
        }
      })();
    }, 1000);

    const redirectUrl = `${url.origin}/patient/devices?withings=connected`;
    console.log('=== REDIRECT TO SUCCESS PAGE ===');
    console.log('Redirect URL:', redirectUrl);
    console.log('=== WITHINGS OAUTH CALLBACK END ===');
    
    return Response.redirect(redirectUrl, 302);

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN OAUTH CALLBACK ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    const url = new URL(req.url);
    const redirectUrl = `${url.origin}/patient/devices?error=internal_error&message=${encodeURIComponent(error.message)}`;
    return Response.redirect(redirectUrl, 302);
  }
});