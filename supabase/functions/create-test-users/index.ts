import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TestUser {
  email: string;
  password: string;
  role: string;
  name: string;
  specialty?: string;
  license?: string;
}

const testUsers: TestUser[] = [
  {
    email: 'patient@test.com',
    password: 'TestPass123!',
    role: 'PATIENT',
    name: 'John Patient'
  },
  {
    email: 'doctor@test.com',
    password: 'TestPass123!',
    role: 'DOCTOR',
    name: 'Dr. Sarah Smith',
    specialty: 'Cardiology',
    license: 'DOC12345'
  },
  {
    email: 'tech@test.com',
    password: 'TestPass123!',
    role: 'TECHNICIAN',
    name: 'Mike Technician'
  },
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'ADMIN',
    name: 'Admin User'
  },
  {
    email: 'hospital@test.com',
    password: 'TestPass123!',
    role: 'HOSPITAL_ADMIN',
    name: 'City Hospital'
  },
  {
    email: 'freelance@test.com',
    password: 'TestPass123!',
    role: 'FREELANCE_TECHNICIAN',
    name: 'Alex Freelancer'
  }
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const results = [];

    for (const user of testUsers) {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users.some(u => u.email === user.email);

      if (userExists) {
        results.push({
          email: user.email,
          status: 'already_exists'
        });
        continue;
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          role: user.role,
          specialty: user.specialty,
          license: user.license
        }
      });

      if (authError) {
        results.push({
          email: user.email,
          status: 'error',
          error: authError.message
        });
      } else {
        results.push({
          email: user.email,
          status: 'created',
          id: authData.user?.id
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        credentials: testUsers.map(u => ({
          email: u.email,
          password: u.password,
          role: u.role
        }))
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});