import { createClient } from 'jsr:@supabase/supabase-js@2';

interface BPReading {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  measuredAt: string;
  deviceModel: string;
  connectionStatus: 'Connected' | 'Disconnected';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function refreshWithingsToken(supabase: any, userId: string, refreshToken: string) {
  console.log('Attempting to refresh Withings access token...');

  const tokenUrl = 'https://wbsapi.withings.net/v2/oauth2';
  const clientId = Deno.env.get('WITHINGS_CLIENT_ID')!;
  const clientSecret = Deno.env.get('WITHINGS_CLIENT_SECRET')!;

  const params = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('Token refresh response status:', data.status);

    if (data.status !== 0 || !data.body?.access_token) {
      console.error('Token refresh failed:', data);
      return null;
    }

    const newAccessToken = data.body.access_token;
    const newRefreshToken = data.body.refresh_token;
    const expiresIn = data.body.expires_in;

    console.log('Token refreshed successfully. Updating database...');

    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

    const { error: updateError } = await supabase
      .from('withings_tokens')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_expiry_timestamp: expiryTimestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update tokens in database:', updateError);
      return null;
    }

    console.log('Tokens updated in database successfully');
    return newAccessToken;
  } catch (error: any) {
    console.error('Error during token refresh:', error.message);
    return null;
  }
}

async function callWithingsAPI(
  endpoint: string,
  accessToken: string,
  params: Record<string, any>
): Promise<any> {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  console.log('Calling Withings API:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== FETCH LATEST BP READING START ===');

    const authHeader = req.headers.get('Authorization');
    console.log('[Edge Function] Authorization header present:', !!authHeader);

    if (!authHeader) {
      console.error('[Edge Function] Missing authorization header');
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Missing authorization header'
        }),
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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Edge Function] Verifying user identity...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[Edge Function] User authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Unauthorized'
        }),
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
      console.error('[Edge Function] No Withings token found for user:', user.id, tokenError?.message);
      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: 'Withings not connected. Please connect your device first.',
          needsConnection: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Edge Function] Withings token found. Token expiry timestamp:', tokenData.token_expiry_timestamp);

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const expiryTimestamp = tokenData.token_expiry_timestamp || 0;
    const isExpired = nowTimestamp >= expiryTimestamp;
    const willExpireSoon = (expiryTimestamp - nowTimestamp) < (5 * 60);

    let accessToken = tokenData.access_token;

    if (isExpired || willExpireSoon) {
      console.log('[Edge Function] Access token expired or expiring soon. Refreshing...');
      const newAccessToken = await refreshWithingsToken(
        supabaseAdmin,
        user.id,
        tokenData.refresh_token
      );

      if (!newAccessToken) {
        console.error('[Edge Function] Token refresh failed. Deleting tokens.');
        await supabaseAdmin
          .from('withings_tokens')
          .delete()
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({
            connectionStatus: 'Disconnected',
            error: 'Token refresh failed. Please reconnect your Withings device.',
            needsReconnect: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = newAccessToken;
      console.log('Using refreshed access token');
    } else {
      console.log('Access token is valid');
    }

    console.log('Fetching BP measurements from Withings API...');
    
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (90 * 24 * 60 * 60);

    console.log('Date range:', {
      startDate,
      endDate,
      startDateISO: new Date(startDate * 1000).toISOString(),
      endDateISO: new Date(endDate * 1000).toISOString(),
    });

    const measureData = await callWithingsAPI(
      'https://wbsapi.withings.net/measure',
      accessToken,
      {
        action: 'getmeas',
        startdate: startDate,
        enddate: endDate,
        meastype: '9,10,11',
      }
    );

    console.log('Withings API response status:', measureData.status);

    if (measureData.status !== 0) {
      console.error('Withings API error. Status:', measureData.status);
      console.error('Error details:', measureData);

      if (measureData.status === 401 || measureData.status === 503) {
        if (measureData.status === 401) {
          console.error('[Edge Function] Invalid or expired access token (401). Deleting tokens and requiring reconnection.');

          await supabaseAdmin
            .from('withings_tokens')
            .delete()
            .eq('user_id', user.id);

          console.log('[Edge Function] Tokens deleted. User must reconnect via OAuth.');

          return new Response(
            JSON.stringify({
              connectionStatus: 'Disconnected',
              error: 'Token invalid. Please reconnect your Withings device.',
              needsReconnect: true,
              tokensDeleted: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (measureData.status === 503) {
          console.error('Rate limiting detected! Consider increasing polling interval.');
        }
      }

      return new Response(
        JSON.stringify({
          connectionStatus: 'Disconnected',
          error: `API error: ${measureData.status}`,
          details: measureData,
          rateLimited: measureData.status === 503
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

    console.log('=== BEFORE SORTING - All measurement timestamps ===');
    bpGroups.forEach((group: any, idx: number) => {
      console.log(`  [${idx}] Date: ${group.date} (${new Date(group.date * 1000).toISOString()}) - grpid: ${group.grpid}`);
    });

    console.log('=== SORTING measurement groups by date (DESCENDING - newest first) ===');
    bpGroups.sort((a: any, b: any) => {
      const diff = b.date - a.date;
      console.log(`  Comparing: ${a.date} vs ${b.date} → diff = ${diff} (${diff > 0 ? 'b is newer' : 'a is newer'})`);
      return diff;
    });

    console.log('=== AFTER SORTING - Sorted timestamps ===');
    bpGroups.forEach((group: any, idx: number) => {
      console.log(`  [${idx}] Date: ${group.date} (${new Date(group.date * 1000).toISOString()}) - grpid: ${group.grpid}`);
    });

    console.log('=== SELECTING FIRST ITEM (NEWEST) ===');

    const latestGroup = bpGroups[0];
    console.log('Latest measurement group:');
    console.log('  - Group ID:', latestGroup.grpid);
    console.log('  - Date:', latestGroup.date, '(', new Date(latestGroup.date * 1000).toISOString(), ')');
    console.log('  - Device ID:', latestGroup.deviceid);
    console.log('  - Model:', latestGroup.model);
    console.log('  - Measures:', JSON.stringify(latestGroup.measures, null, 2));

    const reading: Partial<BPReading> = {
      connectionStatus: 'Connected',
      measuredAt: new Date(latestGroup.date * 1000).toISOString(),
      deviceModel: latestGroup.model || 'BPM Connect',
    };

    console.log('=== PARSING MEASURES FROM NEWEST GROUP ===');
    console.log('Number of measures in this group:', latestGroup.measures.length);

    console.log('=== DETAILED MEASURE INSPECTION ===');
    latestGroup.measures.forEach((m: any, idx: number) => {
      console.log(`Measure ${idx}:`, JSON.stringify(m, null, 2));
    });

    for (const measure of latestGroup.measures) {
      const rawValue = measure.value * Math.pow(10, measure.unit);

      let measureName = 'Unknown';
      if (measure.type === 9) measureName = 'Diastolic BP';
      if (measure.type === 10) measureName = 'Systolic BP';
      if (measure.type === 11) measureName = 'Heart Rate';

      console.log(`  → Type ${measure.type} (${measureName}):`);
      console.log(`     Raw value: ${measure.value}`);
      console.log(`     Unit exponent: ${measure.unit}`);
      console.log(`     Calculation: ${measure.value} × 10^(${measure.unit}) = ${measure.value} × ${Math.pow(10, measure.unit)} = ${rawValue}`);
      console.log(`     Final value: ${Math.round(rawValue)}`);

      if (measure.type === 9) {
        reading.diastolic = Math.round(rawValue);
      } else if (measure.type === 10) {
        reading.systolic = Math.round(rawValue);
      } else if (measure.type === 11) {
        reading.heartRate = Math.round(rawValue);
      }
    }

    console.log('=== FINAL PARSED READING ===');
    console.log('  - Systolic BP:', reading.systolic, 'mmHg');
    console.log('  - Diastolic BP:', reading.diastolic, 'mmHg');
    console.log('  - Heart Rate:', reading.heartRate, 'bpm');
    console.log('  - Measured at:', reading.measuredAt);

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

    console.log('[Edge Function] Saving to withings_measurements table (using service role to bypass RLS)...');
    const { error: dbError } = await supabaseAdmin
      .from('withings_measurements')
      .upsert(dbRecord, { onConflict: 'withings_measure_id', ignoreDuplicates: true });

    if (dbError) {
      console.error('[Edge Function] Database save error:', dbError.message);
    } else {
      console.log('[Edge Function] Measurement saved to database successfully');
    }

    console.log('[Edge Function] Updating user_vitals_live table (using service role to bypass RLS)...');
    const { error: liveError } = await supabaseAdmin
      .from('user_vitals_live')
      .upsert({
        user_id: user.id,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        heart_rate: reading.heartRate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (liveError) {
      console.error('[Edge Function] Error updating user_vitals_live:', liveError.message);
    } else {
      console.log('[Edge Function] user_vitals_live updated successfully');
    }

    console.log('=== FETCH LATEST BP READING END - SUCCESS ===');

    const cleanResponse = {
      systolic: reading.systolic || 0,
      diastolic: reading.diastolic || 0,
      heart_rate: reading.heartRate || 0,
      timestamp: latestGroup.date,
      connectionStatus: 'Connected',
      success: true
    };

    console.log('Sending clean response to UI:', cleanResponse);

    return new Response(
      JSON.stringify(cleanResponse),
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
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});