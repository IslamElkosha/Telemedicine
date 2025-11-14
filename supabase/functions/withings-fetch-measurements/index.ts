import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/oauth2/token';

interface MeasureType {
  type: number;
  field: string;
  measurementType: string;
}

async function refreshAccessToken(supabase: any, userId: string, refreshToken: string): Promise<string | null> {
  try {
    console.log('=== REFRESHING ACCESS TOKEN ===');

    const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID') || '1c8b6291aea7ceaf778f9a6f3f91ac1899cba763248af8cf27d1af0950e31af3';
    const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET') || '215903021c01d0fcd509c5013cf48b7f8637f887ca31f930e8bf5f8ec51fd034';

    const refreshParams = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    console.log('Sending token refresh request');
    const refreshResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });

    const refreshData = await refreshResponse.json();
    console.log('Token refresh response status:', refreshData.status);

    if (refreshData.status !== 0 || !refreshData.body) {
      console.error('Token refresh failed:', refreshData);
      return null;
    }

    const expiresIn = refreshData.body.expires_in || 10800;
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

    const { error: updateError } = await supabase
      .from('withings_tokens')
      .update({
        access_token: refreshData.body.access_token,
        refresh_token: refreshData.body.refresh_token,
        token_expiry_timestamp: expiryTimestamp,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      return null;
    }

    console.log('Token refreshed and updated successfully');
    return refreshData.body.access_token;
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return null;
  }
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

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

    let accessToken = tokenData.access_token;
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300;

    if (tokenData.token_expiry_timestamp <= (now + bufferTime)) {
      console.log('Token expired or expiring soon. Attempting to refresh...');

      const newAccessToken = await refreshAccessToken(supabase, user.id, tokenData.refresh_token);

      if (!newAccessToken) {
        console.error('Failed to refresh token');
        return new Response(
          JSON.stringify({ error: 'Token expired and refresh failed. Please reconnect your device.', needsRefresh: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = newAccessToken;
      console.log('Using newly refreshed token');
    } else {
      console.log('Token is still valid');
    }

    const url = new URL(req.url);
    const lastUpdate = url.searchParams.get('lastupdate') || Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60).toString();

    const measureParams = new URLSearchParams({
      action: 'getmeas',
      lastupdate: lastUpdate,
    });

    const measureResponse = await fetch(`${WITHINGS_MEASURE_URL}?${measureParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

      const latestBP = measurements
        .filter(m => m.measurement_type === 'blood_pressure' && m.systolic && m.diastolic)
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];

      const latestTemp = measurements
        .filter(m => m.measurement_type === 'temperature' && m.temperature)
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];

      if (latestBP) {
        console.log('Updating user_vitals_live with latest BP');
        const { error: bpError } = await supabase
          .from('user_vitals_live')
          .upsert({
            user_id: user.id,
            device_type: 'BPM_CONNECT',
            systolic_bp: latestBP.systolic,
            diastolic_bp: latestBP.diastolic,
            heart_rate: latestBP.heart_rate,
            timestamp: latestBP.measured_at,
          }, { onConflict: 'user_id,device_type' });

        if (bpError) {
          console.error('Error updating user_vitals_live BP:', bpError);
        }
      }

      if (latestTemp) {
        console.log('Updating user_vitals_live with latest temperature');
        const { error: tempError } = await supabase
          .from('user_vitals_live')
          .upsert({
            user_id: user.id,
            device_type: 'THERMO',
            temperature_c: latestTemp.temperature,
            timestamp: latestTemp.measured_at,
          }, { onConflict: 'user_id,device_type' });

        if (tempError) {
          console.error('Error updating user_vitals_live temperature:', tempError);
        }
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