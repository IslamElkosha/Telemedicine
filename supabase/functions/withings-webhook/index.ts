import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Withings webhook received:', body);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userid = body.userid;
    const appli = body.appli;
    const startdate = body.startdate;
    const enddate = body.enddate;

    if (!userid) {
      return new Response(
        JSON.stringify({ error: 'Missing userid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('user_id, access_token')
      .eq('withings_user_id', userid.toString())
      .single();

    if (tokenError || !tokenData) {
      console.error('Token not found for userid:', userid);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Triggering measurement fetch for user:', tokenData.user_id);

    const functionUrl = `${supabaseUrl}/functions/v1/withings-fetch-measurements?lastupdate=${startdate || 0}`;

    (async () => {
      try {
        const fetchResponse = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        const result = await fetchResponse.json();
        console.log('Background fetch result:', result);
      } catch (error) {
        console.error('Background fetch error:', error);
      }
    })();

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});