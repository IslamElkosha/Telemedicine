import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, cache-control, pragma',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_NOTIFY_URL = WITHINGS_API_BASE + '/notify';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== SUBSCRIBE TO WITHINGS NOTIFICATIONS START ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
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
      console.error('User authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { data: tokenData, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('No Withings token found for user:', user.id, tokenError);
      return new Response(
        JSON.stringify({ error: 'No Withings connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found token for Withings User ID:', tokenData.withings_user_id);

    const callbackUrl = `${supabaseUrl}/functions/v1/withings-webhook`;
    const appli = 1;

    const subscribeParams = new URLSearchParams({
      action: 'subscribe',
      callbackurl: callbackUrl,
      appli: appli.toString(),
    });

    console.log('Subscribing to Withings notifications:');
    console.log('  - Callback URL:', callbackUrl);
    console.log('  - Application:', appli, '(health measurements: BP, temp, weight, HR)');
    console.log('  - Access Token (first 30 chars):', tokenData.access_token.substring(0, 30) + '...');
    console.log('  - Subscription URL:', `${WITHINGS_NOTIFY_URL}?${subscribeParams.toString()}`);

    console.log('Sending POST request to Withings API...');
    const subscribeResponse = await fetch(`${WITHINGS_NOTIFY_URL}?${subscribeParams.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Withings API response status:', subscribeResponse.status, subscribeResponse.statusText);
    const responseText = await subscribeResponse.text();
    console.log('Withings API response body (raw):', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Response parsed successfully');
      console.log('Response status code:', responseData.status);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid API response format', raw: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (responseData.status !== 0) {
      console.error('Withings subscription failed. Status:', responseData.status);
      console.error('Error details:', responseData);
      
      let errorMessage = 'Subscription failed';
      switch (responseData.status) {
        case 293:
          errorMessage = 'Callback URL already registered';
          console.log('Note: This may not be an error if already subscribed');
          break;
        case 328:
          errorMessage = 'Invalid callback URL';
          break;
        case 342:
          errorMessage = 'Invalid access token';
          break;
        default:
          errorMessage = `API error: ${responseData.status}`;
      }
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
          status: responseData.status,
          details: responseData,
          alreadySubscribed: responseData.status === 293
        }),
        { 
          status: responseData.status === 293 ? 200 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('=== SUBSCRIPTION SUCCESSFUL ===');
    console.log('Webhook notifications are now active for user:', user.id);
    console.log('Callback URL:', callbackUrl);
    console.log('=== SUBSCRIBE TO WITHINGS NOTIFICATIONS END ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully subscribed to Withings notifications',
        callbackUrl: callbackUrl,
        appli: appli
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN SUBSCRIPTION ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});