import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_MEASURE_URL = WITHINGS_API_BASE + '/v2/measure';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== WITHINGS WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    if (req.method === 'GET') {
      console.log('Health check / validation request');
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Withings webhook endpoint is active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } else {
      const text = await req.text();
      console.log('Raw body:', text);
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    console.log('Webhook payload:', JSON.stringify(body, null, 2));

    const userid = body.userid;
    const appli = body.appli;
    const startdate = body.startdate;
    const enddate = body.enddate;

    console.log('Parsed webhook data:');
    console.log('  - Withings User ID:', userid);
    console.log('  - Application:', appli);
    console.log('  - Start Date:', startdate, startdate ? new Date(startdate * 1000).toISOString() : 'N/A');
    console.log('  - End Date:', enddate, enddate ? new Date(enddate * 1000).toISOString() : 'N/A');

    if (!userid) {
      console.error('Missing userid in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but missing userid' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Responding immediately with 200 OK (within 2 seconds)...');
    const immediateResponse = new Response(
      JSON.stringify({ success: true, message: 'Webhook received and processing' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    setTimeout(() => {
      (async () => {
        try {
          console.log('=== BACKGROUND PROCESSING START ===');
          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          const { data: tokenData, error: tokenError } = await supabase
            .from('withings_tokens')
            .select('*')
            .eq('withings_user_id', userid.toString())
            .maybeSingle();

          if (tokenError || !tokenData) {
            console.error('Token not found for Withings User ID:', userid, tokenError);
            return;
          }

          console.log('Found user:', tokenData.user_id);
          console.log('Fetching measurements from Withings API...');

          const lastUpdate = startdate || Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60);
          const measureParams = new URLSearchParams({
            action: 'getmeas',
            lastupdate: lastUpdate.toString(),
            meastype: '9,10,11,12',
          });

          const measureUrl = `${WITHINGS_MEASURE_URL}?${measureParams.toString()}`;
          console.log('Measure URL:', measureUrl);

          const measureResponse = await fetch(measureUrl, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          });

          const measureData = await measureResponse.json();
          console.log('Measure API response:', JSON.stringify(measureData, null, 2));

          if (measureData.status !== 0) {
            console.error('Withings API error:', measureData.status, measureData);
            return;
          }

          const measureGroups = measureData.body?.measuregrps || [];
          console.log('Received', measureGroups.length, 'measurement groups');

          for (const group of measureGroups) {
            const measurements: any = {
              user_id: tokenData.user_id,
              device_id: group.deviceid || 'unknown',
              device_model: group.model || 'Unknown',
              measured_at: new Date(group.date * 1000).toISOString(),
              withings_measure_id: `${group.grpid}`,
            };

            let hasBP = false;
            let hasTemp = false;

            for (const measure of group.measures) {
              const rawValue = measure.value * Math.pow(10, measure.unit);

              if (measure.type === 9) {
                measurements.diastolic = Math.round(rawValue);
                hasBP = true;
              } else if (measure.type === 10) {
                measurements.systolic = Math.round(rawValue);
                hasBP = true;
              } else if (measure.type === 11) {
                measurements.heart_rate = Math.round(rawValue);
                hasBP = true;
              } else if (measure.type === 12) {
                measurements.temperature = parseFloat(rawValue.toFixed(2));
                hasTemp = true;
              }
            }

            if (hasBP) {
              measurements.measurement_type = 'blood_pressure';
              console.log('Saving BP measurement:', measurements);
              const { error: bpError } = await supabase
                .from('withings_measurements')
                .upsert(measurements, { onConflict: 'withings_measure_id', ignoreDuplicates: true });
              
              if (bpError) {
                console.error('Error saving BP measurement:', bpError);
              } else {
                console.log('BP measurement saved successfully');
              }
            }

            if (hasTemp) {
              measurements.measurement_type = 'temperature';
              console.log('Saving temperature measurement:', measurements);
              const { error: tempError } = await supabase
                .from('withings_measurements')
                .upsert(measurements, { onConflict: 'withings_measure_id', ignoreDuplicates: true });
              
              if (tempError) {
                console.error('Error saving temperature measurement:', tempError);
              } else {
                console.log('Temperature measurement saved successfully');
              }
            }
          }

          console.log('=== BACKGROUND PROCESSING COMPLETE ===');
        } catch (error: any) {
          console.error('=== BACKGROUND PROCESSING ERROR ===');
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    }, 100);

    console.log('=== WITHINGS WEBHOOK END (IMMEDIATE RESPONSE) ===');
    return immediateResponse;

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN WEBHOOK ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});