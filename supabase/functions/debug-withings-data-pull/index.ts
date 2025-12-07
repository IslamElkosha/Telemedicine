import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_MEASURE_URL = WITHINGS_API_BASE + '/measure';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== DEBUG WITHINGS DATA PULL START ===');
    console.log('Timestamp:', new Date().toISOString());
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated User ID:', user.id);
    console.log('User Email:', user.email);

    const { data: tokenData, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('No Withings token found:', tokenError);
      return new Response(
        JSON.stringify({
          error: 'No Withings connection found',
          debug: {
            user_id: user.id,
            user_email: user.email,
            token_error: tokenError?.message,
            message: 'User has not connected their Withings account'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found Withings Token:');
    console.log('  - User ID:', tokenData.user_id);
    console.log('  - Withings User ID:', tokenData.withings_user_id);
    console.log('  - Access Token (first 30 chars):', tokenData.access_token.substring(0, 30) + '...');
    console.log('  - Refresh Token (first 30 chars):', tokenData.refresh_token.substring(0, 30) + '...');
    console.log('  - Token Expires At:', tokenData.expires_at);

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const timeUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    console.log('  - Time until token expiry:', timeUntilExpiry, 'seconds (', Math.floor(timeUntilExpiry / 3600), 'hours )');

    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const measureParams = new URLSearchParams({
      action: 'getmeas',
      startdate: sevenDaysAgo.toString(),
      meastype: '9,10,11',
    });

    const measureUrl = `${WITHINGS_MEASURE_URL}?${measureParams.toString()}`;
    console.log('Withings API Request:');
    console.log('  - URL:', measureUrl);
    console.log('  - Start Date:', sevenDaysAgo, '(', new Date(sevenDaysAgo * 1000).toISOString(), ')');
    console.log('  - Measure Types: 9 (diastolic), 10 (systolic), 11 (heart rate)');
    console.log('  - Authorization: Bearer', tokenData.access_token.substring(0, 30) + '...');

    const measureResponse = await fetch(measureUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Withings API Response Status:', measureResponse.status, measureResponse.statusText);
    
    const responseText = await measureResponse.text();
    console.log('Withings API Response (raw):', responseText);

    let measureData;
    try {
      measureData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Withings response:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON response from Withings API',
          raw_response: responseText,
          debug: {
            user_id: user.id,
            withings_user_id: tokenData.withings_user_id,
            response_status: measureResponse.status,
            response_status_text: measureResponse.statusText,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Withings API Response Status Code:', measureData.status);
    console.log('Number of measure groups:', measureData.body?.measuregrps?.length || 0);

    console.log('=== DEBUG WITHINGS DATA PULL END ===');

    return new Response(
      JSON.stringify({
        success: true,
        debug_info: {
          user_id: user.id,
          user_email: user.email,
          withings_user_id: tokenData.withings_user_id,
          token_expiry: tokenData.expires_at,
          token_valid_for_seconds: timeUntilExpiry,
          request_url: measureUrl,
          request_params: {
            action: 'getmeas',
            startdate: sevenDaysAgo,
            startdate_human: new Date(sevenDaysAgo * 1000).toISOString(),
            meastype: '9,10,11',
          },
        },
        withings_api_response: measureData,
        interpretation: {
          status_code: measureData.status,
          status_meaning: measureData.status === 0 ? 'SUCCESS' : 'ERROR',
          measurement_count: measureData.body?.measuregrps?.length || 0,
          has_data: (measureData.body?.measuregrps?.length || 0) > 0,
        },
      }, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN DEBUG FUNCTION ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
      }, null, 2),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
