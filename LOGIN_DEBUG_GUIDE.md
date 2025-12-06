# Login Debugging Guide

## Issue Identified and Fixed

**Root Cause:** The .env file was configured with credentials for the WRONG Supabase instance:
- Frontend was using: `srbctmwzmbwewqhhulam.supabase.co` (old instance)
- Database was on: `kwlommrclqhpvthqxcge.supabase.co` (new instance)

This mismatch caused the 400 Bad Request error because authentication requests were being sent to a different Supabase project.

**Solution Applied:** Updated .env file with correct JWT-based credentials for `kwlommrclqhpvthqxcge.supabase.co`

## Comprehensive Debugging Added

The codebase now includes extensive console logging to trace the complete authentication flow:

### 1. Supabase Client Initialization (`src/lib/supabase.ts`)
Logs:
- Supabase URL being used
- Whether anon key is present
- First 20 characters of anon key for verification
- Success/failure of client initialization

```
[Supabase] Initializing client with: { url: "...", hasUrl: true, hasAnonKey: true, ... }
[Supabase] Client initialized successfully
```

### 2. Form Submission (`src/components/AuthModal.tsx`)
Logs:
- Form submission start
- Current form data state (email, password presence, types, lengths)
- Values being passed to login function
- Login result (success/failure, error messages)

```
[AuthModal] Form submission started
[AuthModal] Form data state: { email: "user@test.com", emailType: "string", ... }
[AuthModal] Calling login function with: { email: "...", password: "present", role: "patient" }
[AuthModal] Login result: { success: true/false, hasError: ..., errorMessage: "..." }
```

### 3. Login Function (`src/contexts/AuthContext.tsx`)
Logs:
- Login attempt start
- Received parameters (email, password type/length, role)
- Validation results
- Prepared payload for Supabase
- Supabase API call status
- Response details (user data, session, errors)

```
[AuthContext] Login attempt started
[AuthContext] Received parameters: { email: "...", emailType: "string", passwordLength: 12, role: "patient" }
[AuthContext] Prepared login payload: { email: "...", password: "***123", passwordLength: 12 }
[AuthContext] Calling supabase.auth.signInWithPassword...
[AuthContext] Supabase response received: { hasData: true, hasUser: true, hasError: false }
```

## How to Debug Login Issues

1. **Open Browser Developer Console** (F12 or Right-click → Inspect → Console tab)

2. **Attempt to Login** - The console will show the complete flow:
   - Supabase client initialization status
   - Form data capture and validation
   - API call payload
   - Server response

3. **Identify the Problem:**

   **If you see:**
   - `[Supabase] Missing environment variables` → Check .env file exists and has correct values
   - `email: undefined` or `password: undefined` → Form inputs not binding correctly
   - `emailType: "object"` → Wrong value type being passed
   - `passwordLength: 0` → Password field is empty
   - `errorStatus: 400` → Bad request (usually credentials/payload issue)
   - `errorStatus: 401` → Invalid credentials
   - `errorMessage: "Invalid email or password"` → Wrong credentials or user doesn't exist

## Testing Login

To test the login functionality:

1. **Register a New User:**
   - Click "Sign Up" tab in the auth modal
   - Fill in required information
   - Submit the form
   - Check console for registration logs

2. **Login with Registered User:**
   - Use the email and password from registration
   - Check console output for the complete authentication flow
   - Verify redirect to appropriate dashboard

## Current Configuration

- **Instance:** kwlommrclqhpvthqxcge.supabase.co
- **Auth Method:** Email/Password (Supabase Auth)
- **Session Storage:** localStorage
- **Auto Refresh:** Enabled
- **Persist Session:** Enabled
- **API Key Format:** Publishable Key (sb_publishable_...)

## Important Notes

1. **Environment Variables:** The frontend uses the newer publishable key format (starting with "sb_publishable_") which is Supabase's recommended approach for improved security and key management

2. **No Test Users:** All test accounts have been removed. You must register new users through the application.

3. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

4. **Role Validation:** The system validates that users can only login with their registered role. Attempting to login as a different role will fail.

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure .env file exists in project root with correct values

### Issue: Email/Password fields showing as undefined
**Solution:** Check that input fields have `value={formData.email}` and `onChange` handlers

### Issue: 400 Bad Request
**Solution:** Verify .env credentials match your Supabase project URL

### Issue: Login succeeds but no user data
**Solution:** Check that user record exists in `public.users` table and RLS policies allow read access

## Monitoring Authentication

All authentication events are logged in the console with the `[AuthContext]`, `[AuthModal]`, or `[Supabase]` prefix for easy filtering.

You can filter console logs by typing one of these prefixes in the console filter box to see only authentication-related logs.
