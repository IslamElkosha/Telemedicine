import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const REDIRECT_URI = 'https://comprehensive-teleme-pbkl.bolt.host/withings-callback';

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

    let code: string, userId: string;

    if (req.method === 'POST') {
      const body = await req.json();
      code = body.code;
      userId = body.userId;
    } else {
      const url = new URL(req.url);
      code = url.searchParams.get('code') || '';
      userId = url.searchParams.get('userId') || '';
    }

    console.log('=== WITHINGS TOKEN EXCHANGE START ===');
    console.log('User ID:', userId);
    console.log('Code present:', !!code);
    console.log('Redirect URI (hardcoded):', REDIRECT_URI);

    if (!code || !userId) {
      console.error('Missing required parameters');
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Missing required parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=server_configuration' }
      });
    }

    console.log('Token exchange configuration:');
    console.log('  - Token URL:', WITHINGS_TOKEN_URL);
    console.log('  - Client ID:', WITHINGS_CLIENT_ID.substring(0, 15) + '...');
    console.log('  - Redirect URI:', REDIRECT_URI);

    const params = new URLSearchParams();
    params.append('action', 'requesttoken');
    params.append('grant_type', 'authorization_code');
    params.append('client_id', WITHINGS_CLIENT_ID);
    params.append('client_secret', WITHINGS_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

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
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Invalid response from Withings' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=invalid_withings_response' }
      });
    }

    if (tokenData.status !== 0) {
      console.error('Withings API error:', tokenData);
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Withings API error: ' + (tokenData.error || 'Unknown error') }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=withings_api_error' }
      });
    }

    if (!tokenData.body?.access_token || !tokenData.body?.refresh_token) {
      console.error('Missing tokens in Withings response');
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Missing tokens in Withings response' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
      expires_in: expiresIn,
      scope: tokenData.body.scope || '',
      updated_at: new Date().toISOString(),
    };

    console.log('=== SAVING TO DATABASE ===');
    console.log('Token Record to Save:');
    console.log('  - User ID:', userId);
    console.log('  - User ID Type:', typeof userId);
    console.log('  - Withings User ID:', tokenRecord.withings_userid);
    console.log('  - Expires In:', expiresIn);
    console.log('  - Scope:', tokenRecord.scope);
    console.log('  - Access Token (first 20 chars):', tokenRecord.access_token.substring(0, 20) + '...');
    console.log('  - Refresh Token (first 20 chars):', tokenRecord.refresh_token.substring(0, 20) + '...');

    console.log('Attempting upsert with SERVICE_ROLE_KEY (bypasses RLS)...');

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('withings_tokens')
      .upsert(tokenRecord, { onConflict: 'user_id' })
      .select();

    if (dbError) {
      console.error('=== DATABASE ERROR ===');
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      console.error('Error details:', JSON.stringify(dbError.details, null, 2));
      console.error('Error hint:', dbError.hint);
      console.error('Full error object:', JSON.stringify(dbError, null, 2));
      if (req.method === 'POST') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database error: ' + dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, 'Location': '/?error=database_error' }
      });
    }

    console.log('=== DATABASE SAVE SUCCESS ===');
    console.log('Saved record count:', insertData?.length || 0);
    console.log('Saved record:', JSON.stringify(insertData, null, 2));

    console.log('Verifying token was saved...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('withings_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Verification read failed:', verifyError);
    } else if (!verifyData) {
      console.error('❌ Token not found after upsert!');
    } else {
      console.log('✅ Token verified in database:', verifyData.id);
    }

    console.log('=== TOKEN EXCHANGE COMPLETE ===');

    if (req.method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, 'Location': '/?success=device_linked' }
    });
  } catch (error: any) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    if (req.method === 'POST') {
      return new Response(JSON.stringify({ success: false, error: error.message || 'Token exchange failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, 'Location': '/?error=linking_failed' }
    });
  }
});