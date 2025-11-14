import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';

interface ThermoReading {
  temperature: number;
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
      meastype: '73',
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
          message: 'No temperature readings found',
          data: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const thermoGroups = measureGroups.filter((group: any) => {
      const hasThermoMeasure = group.measures.some((m: any) => m.type === 73);
      return hasThermoMeasure;
    });

    if (thermoGroups.length === 0) {
      return new Response(
        JSON.stringify({
          connectionStatus: 'Connected',
          message: 'No temperature readings found',
          data: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const latestGroup = thermoGroups[0];
    const thermoMeasure = latestGroup.measures.find((m: any) => m.type === 73);

    if (!thermoMeasure) {
      return new Response(
        JSON.stringify({
          connectionStatus: 'Connected',
          message: 'No temperature reading in latest group',
          data: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawValue = thermoMeasure.value * Math.pow(10, thermoMeasure.unit);
    const temperatureCelsius = rawValue / 1000;

    const reading: ThermoReading = {
      connectionStatus: 'Connected',
      temperature: Math.round(temperatureCelsius * 100) / 100,
      measuredAt: new Date(latestGroup.date * 1000).toISOString(),
      deviceModel: latestGroup.model || 'Thermo SCT01',
    };

    const dbRecord = {
      user_id: user.id,
      measurement_type: 'temperature',
      temperature: reading.temperature,
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
    console.error('Error fetching temperature reading:', error);
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