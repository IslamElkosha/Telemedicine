import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/oauth2/token';

interface ThermoReading {
  temperature: number;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/handle-withings-callback`;

    const refreshParams = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET,
      redirect_uri: redirectUri,
      refresh_token: refreshToken,
    });

    console.log('Sending token refresh request to:', WITHINGS_TOKEN_URL);
    console.log('Refresh parameters:', {
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID,
      client_secret: WITHINGS_CLIENT_SECRET.substring(0, 10) + '...',
      redirect_uri: redirectUri,
      refresh_token: refreshToken.substring(0, 20) + '...',
    });

    const refreshResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });

    const refreshData = await refreshResponse.json();
    console.log('Token refresh response:', JSON.stringify(refreshData, null, 2));

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
      console.error('Failed to update token:', updateError);
      return null;
    }

    console.log('Token refreshed successfully');
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

    let accessToken = tokenData.access_token;
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300;

    if (tokenData.token_expiry_timestamp <= (now + bufferTime)) {
      console.log('Token expired or expiring soon. Attempting to refresh...');

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
      console.log('Token is still valid');
    }

    const lastUpdate = Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60);
    const measureParams = new URLSearchParams({
      action: 'getmeas',
      lastupdate: lastUpdate.toString(),
      meastype: '73',
    });

    const measureResponse = await fetch(`${WITHINGS_MEASURE_URL}?${measureParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const measureData = await measureResponse.json();

    if (measureData.status !== 0) {
      console.error('Withings API error:', measureData);

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

    console.log('Updating user_vitals_live table...');
    const { error: liveError } = await supabase
      .from('user_vitals_live')
      .upsert({
        user_id: user.id,
        device_type: 'THERMO',
        temperature_c: reading.temperature,
        timestamp: reading.measuredAt,
      }, { onConflict: 'user_id,device_type' });

    if (liveError) {
      console.error('Error updating user_vitals_live:', liveError);
    } else {
      console.log('user_vitals_live updated successfully');
    }

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