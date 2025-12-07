import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const demoUsers = [
      {
        email: 'patient@test.com',
        password: 'Demo123!',
        role: 'PATIENT',
        fullName: 'Test Patient',
        phone: '+1234567890',
      },
      {
        email: 'doctor@test.com',
        password: 'Demo123!',
        role: 'DOCTOR',
        fullName: 'Dr. Test Doctor',
        phone: '+1234567891',
        specialty: 'Cardiology',
        licenseNo: 'MD12345',
      },
    ];

    const results = [];

    for (const user of demoUsers) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === user.email);

      if (userExists) {
        results.push({ email: user.email, status: 'already_exists' });
        continue;
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role,
          specialty: user.specialty,
          license: user.licenseNo,
          phone: user.phone,
        },
      });

      if (authError) {
        results.push({ email: user.email, status: 'error', error: authError.message });
        continue;
      }

      if (!authData.user) {
        results.push({ email: user.email, status: 'error', error: 'No user returned' });
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      results.push({ email: user.email, status: 'created', userId: authData.user.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: 'Demo users processed successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating demo users:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
