import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';

interface MeasureType {
  type: number;
  field: string;
  measurementType: string;
}

const MEASURE_TYPES: MeasureType[] = [
  { type: 1, field: 'weight', measurementType: 'weight' },
  { type: 11, field: 'heart_rate', measurementType: 'heart_rate' },
  { type: 9, field: 'diastolic', measurementType: 'blood_pressure' },
  { type: 10, field: 'systolic', measurementType: 'blood_pressure' },
  { type: 54, field: 'spo2', measurementType: 'spo2' },
  { type: 71, field: 'temperature', measurementType: 'temperature' },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'No Withings connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.token_expiry_timestamp <= now) {
      return new Response(
        JSON.stringify({ error: 'Token expired', needsRefresh: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const lastUpdate = url.searchParams.get('lastupdate') || Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60).toString();

    const measureParams = new URLSearchParams({
      action: 'getmeas',
      lastupdate: lastUpdate,
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
        JSON.stringify({ error: 'Failed to fetch measurements', details: measureData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const measurements: any[] = [];
    const measureGroups = measureData.body?.measuregrps || [];

    for (const group of measureGroups) {
      const measuredAt = new Date(group.date * 1000);
      const deviceId = group.deviceid || 'unknown';

      const groupMeasures: any = {
        user_id: user.id,
        measured_at: measuredAt.toISOString(),
        device_id: deviceId,
        device_model: group.model || 'Unknown Device',
        withings_measure_id: `${group.grpid}`,
      };

      for (const measure of group.measures) {
        const measureType = MEASURE_TYPES.find(t => t.type === measure.type);
        if (measureType) {
          const value = measure.value * Math.pow(10, measure.unit);

          if (measureType.field === 'systolic') {
            groupMeasures.systolic = Math.round(value);
            groupMeasures.measurement_type = 'blood_pressure';
          } else if (measureType.field === 'diastolic') {
            groupMeasures.diastolic = Math.round(value);
            groupMeasures.measurement_type = 'blood_pressure';
          } else if (measureType.field === 'heart_rate') {
            groupMeasures.heart_rate = Math.round(value);
            groupMeasures.measurement_type = 'heart_rate';
          } else if (measureType.field === 'temperature') {
            groupMeasures.temperature = value;
            groupMeasures.measurement_type = 'temperature';
          } else if (measureType.field === 'spo2') {
            groupMeasures.spo2 = Math.round(value);
            groupMeasures.measurement_type = 'spo2';
          } else if (measureType.field === 'weight') {
            groupMeasures.weight = value;
            groupMeasures.measurement_type = 'weight';
          }
        }
      }

      if (groupMeasures.measurement_type) {
        measurements.push(groupMeasures);
      }
    }

    if (measurements.length > 0) {
      const { error: insertError } = await supabase
        .from('withings_measurements')
        .upsert(measurements, { onConflict: 'withings_measure_id', ignoreDuplicates: true });

      if (insertError) {
        console.error('Database insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store measurements', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: measurements.length,
        measurements: measurements,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching measurements:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});