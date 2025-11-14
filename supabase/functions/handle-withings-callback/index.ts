import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    console.log('OAuth callback received:', { code: code ? 'present' : 'missing', state, error });

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const redirectUrl = `${url.origin}/patient/devices?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!code) {
      console.error('Missing authorization code');
      const redirectUrl = `${url.origin}/patient/devices?error=missing_code`;
      return Response.redirect(redirectUrl, 302);
    }

    const userId = state;
    if (!userId) {
      console.error('Missing state (user_id)');
      const redirectUrl = `${url.origin}/patient/devices?error=missing_state`;
      return Response.redirect(redirectUrl, 302);
    }

    const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID') || '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
    const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET') || '215903021c01d0fcd509c5013cf48b7f8637f887ca31f930e8bf5f8ec51fd034';
    const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${supabaseUrl}/functions/v1/handle-withings-callback`;

    console.log('Token exchange parameters:', {
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: WITHINGS_CLIENT_ID.substring(0, 10) + '...',
      redirect_uri: redirectUri,
      code_present: !!code
    });

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

    console.log('Token response status:', tokenResponse.status, tokenResponse.statusText);
    const tokenData = await tokenResponse.json();
    console.log('Token response data:', { status: tokenData.status, hasBody: !!tokenData.body });

    if (tokenData.status !== 0) {
      console.error('Withings token exchange failed:', {
        status: tokenData.status,
        error: tokenData.error,
        message: tokenData.message || 'Unknown error'
      });
      const redirectUrl = `${url.origin}/patient/devices?error=token_exchange_failed&status=${tokenData.status}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!tokenData.body || !tokenData.body.access_token) {
      console.error('Invalid token response - missing access_token:', tokenData);
      const redirectUrl = `${url.origin}/patient/devices?error=invalid_token_response`;
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

    console.log('Saving tokens to database for user:', userId);
    const { error: dbError } = await supabase
      .from('withings_tokens')
      .upsert(tokenRecord, { onConflict: 'user_id' });

    if (dbError) {
      console.error('Database error:', dbError);
      const redirectUrl = `${url.origin}/patient/devices?error=database_error&details=${encodeURIComponent(dbError.message)}`;
      return Response.redirect(redirectUrl, 302);
    }

    console.log('Tokens saved successfully!');

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
    console.log('Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 302);

  } catch (error: any) {
    console.error('Critical error in OAuth callback:', error);
    const url = new URL(req.url);
    const redirectUrl = `${url.origin}/patient/devices?error=internal_error&message=${encodeURIComponent(error.message)}`;
    return Response.redirect(redirectUrl, 302);
  }
});