import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
const WITHINGS_MEASURE_PATH = '/v2/measure';
const WITHINGS_TOKEN_PATH = '/v2/oauth2';
const WITHINGS_MEASURE_URL = WITHINGS_API_BASE + WITHINGS_MEASURE_PATH;
const WITHINGS_TOKEN_URL = WITHINGS_API_BASE + WITHINGS_TOKEN_PATH;

interface BPReading {
  systolic: number;
  diastolic: number;
  heartRate: number;
  measuredAt: string;
  deviceModel: string;
  connectionStatus: 'Connected' | 'Disconnected';
  error?: string;
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

    console.log('Token refreshed successfully!');
    console.log('  - New Access Token (first 30 chars):', refreshData.body.access_token?.substring(0, 30) + '...');
    console.log('  - New Refresh Token (first 30 chars):', refreshData.body.refresh_token?.substring(0, 30) + '...');

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

    console.log('Token updated in database successfully');
    return refreshData.body.access_token;
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return null;
  }
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

    let accessToken = tokenData.access_token;
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300;
    
    if (tokenData.token_expiry_timestamp <= (now + bufferTime)) {
      console.log('Token expired or expiring soon. Attempting to refresh...');
      console.log('  - Current time:', now);
      console.log('  - Token expiry:', tokenData.token_expiry_timestamp);
      console.log('  - Time until expiry:', tokenData.token_expiry_timestamp - now, 'seconds');
      
      const newAccessToken = await refreshAccessToken(supabase, user.id, tokenData.refresh_token);
      
      if (!newAccessToken) {
        console.error('Failed to refresh token');
        return new Response(
          JSON.stringify({
            connectionStatus: 'Disconnected',
            error: 'Token expired and refresh failed. Please reconnect your device.',
            needsRefresh: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      accessToken = newAccessToken;
      console.log('Using newly refreshed token');
    } else {
      console.log('Token is still valid for', tokenData.token_expiry_timestamp - now, 'seconds');
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
      meastype: '9,10,11',
    });

    const measureUrl = `${WITHINGS_MEASURE_URL}?${measureParams.toString()}`;
    console.log('Fetching measurements from:', measureUrl);
    console.log('Request parameters:');
    console.log('  - action: getmeas');
    console.log('  - startdate:', sevenDaysAgo, '(', new Date(sevenDaysAgo * 1000).toISOString(), ')');
    console.log('  - enddate:', nowTimestamp, '(', new Date(nowTimestamp * 1000).toISOString(), ')');
    console.log('  - meastype: 9 (diastolic), 10 (systolic), 11 (heart rate)');

    const measureResponse = await fetch(measureUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

      if (measureData.status === 401 || measureData.status === 503) {
        if (measureData.status === 401) {
          console.error('Invalid or expired access token (401). Deleting tokens and requiring reconnection.');

          await supabase
            .from('withings_tokens')
            .delete()
            .eq('user_id', user.id);

          console.log('Tokens deleted. User must reconnect via OAuth.');

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
    console.log('  - Measures:', latestGroup.measures);

    const reading: Partial<BPReading> = {
      connectionStatus: 'Connected',
      measuredAt: new Date(latestGroup.date * 1000).toISOString(),
      deviceModel: latestGroup.model || 'BPM Connect',
    };

    console.log('=== PARSING MEASURES FROM NEWEST GROUP ===');
    console.log('Number of measures in this group:', latestGroup.measures.length);

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

    console.log('Saving to withings_measurements table...');
    const { error: dbError } = await supabase
      .from('withings_measurements')
      .upsert(dbRecord, { onConflict: 'withings_measure_id', ignoreDuplicates: true });

    if (dbError) {
      console.error('Database save error:', dbError);
    } else {
      console.log('Measurement saved to database successfully');
    }

    console.log('Updating user_vitals_live table...');
    const { error: liveError } = await supabase
      .from('user_vitals_live')
      .upsert({
        user_id: user.id,
        device_type: 'BPM_CONNECT',
        systolic_bp: reading.systolic,
        diastolic_bp: reading.diastolic,
        heart_rate: reading.heartRate,
        timestamp: reading.measuredAt,
      }, { onConflict: 'user_id,device_type' });

    if (liveError) {
      console.error('Error updating user_vitals_live:', liveError);
    } else {
      console.log('user_vitals_live updated successfully');
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
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});