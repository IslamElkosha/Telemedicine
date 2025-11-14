import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_MEASURE_PATH = '/v2/measure';
const WITHINGS_MEASURE_URL = WITHINGS_API_BASE + WITHINGS_MEASURE_PATH;

interface BPReading {
  systolic: number;
  diastolic: number;
  heartRate: number;
  measuredAt: string;
  deviceModel: string;
  connectionStatus: 'Connected' | 'Disconnected';
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== FETCH LATEST BP READING START ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Missing authorization header'
        }),
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
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Unauthorized'
        }),
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
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'No Withings connection found. Please connect your device.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found Withings token:');
    console.log('  - User ID:', tokenData.user_id);
    console.log('  - Withings User ID:', tokenData.withings_user_id);
    console.log('  - Access Token (first 30 chars):', tokenData.access_token.substring(0, 30) + '...');
    console.log('  - Token Expiry:', new Date(tokenData.token_expiry_timestamp * 1000).toISOString());

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.token_expiry_timestamp <= now) {
      console.error('Token expired. Expiry:', tokenData.token_expiry_timestamp, 'Now:', now);
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Token expired. Please reconnect your device.',
          needsRefresh: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lastUpdate = Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60);
    const measureParams = new URLSearchParams({
      action: 'getmeas',
      lastupdate: lastUpdate.toString(),
      meastype: '9,10,11',
    });

    const measureUrl = `${WITHINGS_MEASURE_URL}?${measureParams.toString()}`;
    console.log('Fetching measurements from:', measureUrl);
    console.log('Request parameters:');
    console.log('  - action: getmeas');
    console.log('  - lastupdate:', lastUpdate, '(', new Date(lastUpdate * 1000).toISOString(), ')');
    console.log('  - meastype: 9 (diastolic), 10 (systolic), 11 (heart rate)');

    const measureResponse = await fetch(measureUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    console.log('Withings API response status:', measureResponse.status, measureResponse.statusText);
    const measureText = await measureResponse.text();
    console.log('Withings API response body (raw):', measureText);

    let measureData;
    try {
      measureData = JSON.parse(measureText);
      console.log('Response parsed successfully');
      console.log('Response status code:', measureData.status);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Invalid API response format'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (measureData.status !== 0) {
      console.error('Withings API error. Status:', measureData.status);
      console.error('Error details:', measureData);
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: `API error: ${measureData.status}`,
          details: measureData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const measureGroups = measureData.body?.measuregrps || [];
    console.log('Number of measurement groups received:', measureGroups.length);
    
    if (measureGroups.length === 0) {
      console.log('No measurements found for user');
      return new Response(
        JSON.stringify({
          connectionStatus: 'Connected',
          message: 'No blood pressure readings found',
          data: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bpGroups = measureGroups.filter((group: any) => {
      const hasRelevantMeasures = group.measures.some((m: any) => 
        m.type === 9 || m.type === 10 || m.type === 11
      );
      return hasRelevantMeasures;
    });

    console.log('Filtered BP measurement groups:', bpGroups.length);

    if (bpGroups.length === 0) {
      console.log('No BP-specific measurements found');
      return new Response(
        JSON.stringify({
          connectionStatus: 'Connected',
          message: 'No blood pressure readings found',
          data: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const latestGroup = bpGroups[0];
    console.log('Latest measurement group:');
    console.log('  - Group ID:', latestGroup.grpid);
    console.log('  - Date:', latestGroup.date, '(', new Date(latestGroup.date * 1000).toISOString(), ')');
    console.log('  - Device ID:', latestGroup.deviceid);
    console.log('  - Model:', latestGroup.model);
    console.log('  - Measures:', latestGroup.measures);

    const reading: Partial<BPReading> = {
      connectionStatus: 'Connected',
      measuredAt: new Date(latestGroup.date * 1000).toISOString(),
      deviceModel: latestGroup.model || 'BPM Connect',
    };

    for (const measure of latestGroup.measures) {
      const rawValue = measure.value * Math.pow(10, measure.unit);
      console.log(`  - Measure type ${measure.type}: ${measure.value} * 10^${measure.unit} = ${rawValue}`);
      
      if (measure.type === 9) {
        reading.diastolic = Math.round(rawValue);
      } else if (measure.type === 10) {
        reading.systolic = Math.round(rawValue);
      } else if (measure.type === 11) {
        reading.heartRate = Math.round(rawValue);
      }
    }

    console.log('Parsed reading:');
    console.log('  - Systolic:', reading.systolic, 'mmHg');
    console.log('  - Diastolic:', reading.diastolic, 'mmHg');
    console.log('  - Heart Rate:', reading.heartRate, 'bpm');

    const dbRecord = {
      user_id: user.id,
      measurement_type: 'blood_pressure',
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heart_rate: reading.heartRate,
      measured_at: reading.measuredAt,
      device_id: latestGroup.deviceid || 'unknown',
      device_model: reading.deviceModel,
      withings_measure_id: `${latestGroup.grpid}`,
    };

    console.log('Saving to withings_measurements table...');
    const { error: dbError } = await supabase
      .from('withings_measurements')
      .upsert(dbRecord, { onConflict: 'withings_measure_id', ignoreDuplicates: true });

    if (dbError) {
      console.error('Database save error:', dbError);
    } else {
      console.log('Measurement saved to database successfully');
    }

    console.log('=== FETCH LATEST BP READING END - SUCCESS ===');
    
    return new Response(
      JSON.stringify({
        connectionStatus: 'Connected',
        data: reading,
        success: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN FETCH BP READING ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        connectionStatus: 'Disconnected',
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});