import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Unauthorized'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'No Withings connection found. Please connect your device.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.token_expiry_timestamp <= now) {
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

    const measureResponse = await fetch(`${WITHINGS_MEASURE_URL}?${measureParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const measureData = await measureResponse.json();

    if (measureData.status !== 0) {
      console.error('Withings API error:', measureData);
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
    
    if (measureGroups.length === 0) {
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

    if (bpGroups.length === 0) {
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
    const reading: Partial<BPReading> = {
      connectionStatus: 'Connected',
      measuredAt: new Date(latestGroup.date * 1000).toISOString(),
      deviceModel: latestGroup.model || 'BPM Connect',
    };

    for (const measure of latestGroup.measures) {
      const rawValue = measure.value * Math.pow(10, measure.unit);
      
      if (measure.type === 9) {
        reading.diastolic = Math.round(rawValue);
      } else if (measure.type === 10) {
        reading.systolic = Math.round(rawValue);
      } else if (measure.type === 11) {
        reading.heartRate = Math.round(rawValue);
      }
    }

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

    await supabase
      .from('withings_measurements')
      .upsert(dbRecord, { onConflict: 'withings_measure_id', ignoreDuplicates: true });

    return new Response(
      JSON.stringify({
        connectionStatus: 'Connected',
        data: reading,
        success: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching BP reading:', error);
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