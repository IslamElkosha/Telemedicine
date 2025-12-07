import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get authorization header for user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the authorization code and state from request body
    const { code, state } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify state parameter for CSRF protection
    if (state) {
      const { data: stateData, error: stateError } = await supabase
        .from("oauth_states")
        .select("user_id, expires_at")
        .eq("state", state)
        .eq("provider", "withings")
        .single();

      if (stateError || !stateData) {
        return new Response(
          JSON.stringify({ error: "Invalid state parameter" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Check if state has expired
      if (new Date(stateData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "State parameter expired" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Verify state belongs to the authenticated user
      if (stateData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "State mismatch" }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Delete used state
      await supabase.from("oauth_states").delete().eq("state", state);
    }

    // Get Withings credentials from environment
    const clientId = Deno.env.get("WITHINGS_CLIENT_ID");
    const clientSecret = Deno.env.get("WITHINGS_CLIENT_SECRET");
    const redirectUri = Deno.env.get("WITHINGS_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing Withings configuration" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Exchange authorization code for access token
    // CRITICAL: Use application/x-www-form-urlencoded, NOT JSON
    const tokenParams = new URLSearchParams({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://wbsapi.withings.net/v2/oauth2", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.status !== 0 || !tokenData.body) {
      console.error("Withings token exchange error:", tokenData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to exchange code for tokens",
          details: tokenData.error || "Unknown error"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
      userid: withings_userid,
    } = tokenData.body;

    // Calculate expires_at timestamp
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Upsert tokens into withings_tokens table
    const { error: upsertError } = await supabase
      .from("withings_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token,
          refresh_token,
          expires_in,
          expires_at: expiresAt.toISOString(),
          scope: scope || "",
          withings_userid: withings_userid.toString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save tokens", details: upsertError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Withings account connected successfully",
        withings_userid,
        expires_at: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in withings-callback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
