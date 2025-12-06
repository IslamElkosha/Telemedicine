import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/v2/measure';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

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

    const refreshParams = new URLSearchParams();
    refreshParams.append('action', 'requesttoken');
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('client_id', WITHINGS_CLIENT_ID);
    refreshParams.append('client_secret', WITHINGS_CLIENT_SECRET);
    refreshParams.append('refresh_token', refreshToken);

    console.log('Sending token refresh request to:', WITHINGS_TOKEN_URL);
    console.log('Refresh parameters:', {
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET.substring(0, 10) + '...',
      refresh_token: refreshToken.substring(0, 20) + '...',
    });
    const refreshResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });

    const refreshData = await refreshResponse.json();
    console.log('Token refresh response status:', refreshData.status);
    console.log('Full refresh response:', JSON.stringify(refreshData, null, 2));

    if (refreshData.status !== 0 || !refreshData.body) {
      console.error('Token refresh failed. Deleting expired tokens from database.');
      console.error('Error details:', refreshData);

      await supabase
        .from('withings_tokens')
        .delete()
        .eq('user_id', userId);

      console.log('Expired tokens deleted. User must reconnect.');
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
    console.log('=== WITHINGS FETCH MEASUREMENTS START ===');

    const authHeader = req.headers.get('Authorization');
    console.log('[Edge Function] Authorization header present:', !!authHeader);

    if (!authHeader) {
      console.error('[Edge Function] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] Auth header value (first 20 chars):', authHeader.slice(0, 20) + '...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[Edge Function] Creating user context client (forwarding auth header)...');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    console.log('[Edge Function] Creating service role client (for writes that bypass RLS)...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('[Edge Function] Verifying user identity...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[Edge Function] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] Authenticated user:', user.id);

    console.log('[Edge Function] Reading withings_tokens with user context (RLS enforced)...');
    const { data: tokenData, error: tokenError } = await supabaseUser
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('[Edge Function] No Withings token found:', tokenError?.message);
      return new Response(
        JSON.stringify({ error: 'No Withings connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData.access_token;
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300;

    if (tokenData.token_expiry_timestamp <= (now + bufferTime)) {
      console.log('[Edge Function] Token expired or expiring soon. Attempting to refresh...');

      const newAccessToken = await refreshAccessToken(supabaseAdmin, user.id, tokenData.refresh_token);

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

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = nowTimestamp - (7 * 24 * 60 * 60);

    console.log('=== DYNAMIC TIMESTAMP CALCULATION ===');
    console.log('  - Current time (now):', nowTimestamp, '→', new Date(nowTimestamp * 1000).toISOString());
    console.log('  - 7 days ago (startdate):', sevenDaysAgo, '→', new Date(sevenDaysAgo * 1000).toISOString());
    console.log('  - This calculation runs FRESH on every request');

    const measureParams = new URLSearchParams({
      action: 'getmeas',
      startdate: sevenDaysAgo.toString(),
      enddate: nowTimestamp.toString(),
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

    console.log('Received', measureGroups.length, 'measurement groups from Withings API');
    console.log('SORTING measurement groups by date (descending)...');
    measureGroups.sort((a: any, b: any) => b.date - a.date);

    console.log('Measurement groups sorted. First 3 timestamps:');
    for (let i = 0; i < Math.min(3, measureGroups.length); i++) {
      console.log(`  ${i + 1}. Date: ${measureGroups[i].date} (${new Date(measureGroups[i].date * 1000).toISOString()})`);
    }

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