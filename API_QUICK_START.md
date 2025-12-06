# Edge Functions API - Quick Start Guide

This guide shows you how to use the centralized Edge Functions API utility.

---

## Basic Usage

### 1. Import the Utility

```typescript
import { edgeFunctions } from '../lib/edgeFunctions';
```

### 2. Call Edge Functions

```typescript
const result = await edgeFunctions.fetchLatestBPReading();

if (result.success) {
  // Use result.data
  console.log('BP Data:', result.data);
} else {
  // Handle result.error
  setError(result.error);
}
```

That's it! Authentication, headers, and error handling are automatic.

---

## Available Functions

### Device Linking

```typescript
// Start Withings OAuth flow
const result = await edgeFunctions.startWithingsAuth();
if (result.success) {
  window.location.href = result.data.authUrl;
}

// Force reconnection (clears old tokens)
const result = await edgeFunctions.forceWithingsRelink();
if (result.success) {
  window.location.href = result.data.authUrl;
}
```

### Data Fetching

```typescript
// Fetch latest blood pressure reading
const result = await edgeFunctions.fetchLatestBPReading();
if (result.success) {
  const { systolic, diastolic, heart_rate } = result.data;
}

// Fetch latest temperature reading
const result = await edgeFunctions.fetchLatestThermoData();
if (result.success) {
  const { temperature, timestamp } = result.data;
}
```

### Data Synchronization

```typescript
// Sync all measurements from Withings
const result = await edgeFunctions.withingsFetchMeasurements();
if (result.success) {
  console.log('Measurements synced:', result.data);
}

// Refresh expired access token
const result = await edgeFunctions.withingsRefreshToken();
if (result.success) {
  console.log('Token refreshed');
}
```

### Notifications

```typescript
// Subscribe to Withings push notifications
const result = await edgeFunctions.subscribeWithingsNotify();
if (result.success) {
  console.log('Subscribed to real-time updates');
}
```

### Debugging

```typescript
// Debug API connection and data
const result = await edgeFunctions.debugWithingsDataPull();
if (result.success) {
  console.log('Debug data:', result.data);
}
```

---

## Response Format

All Edge Functions return a standardized response:

```typescript
interface EdgeFunctionResponse<T> {
  success: boolean;
  data?: T;       // Present if success = true
  error?: string; // Present if success = false
  details?: any;  // Additional error context
}
```

---

## Error Handling

### Standard Pattern

```typescript
const result = await edgeFunctions.myFunction();

if (!result.success) {
  // Show error to user
  alert(result.error);

  // Log technical details
  console.error('Error details:', result.details);

  return; // Exit early
}

// Continue with result.data
const data = result.data;
```

### Common Errors

**"Please log in to continue"**
- User session expired or missing
- Redirect user to login page

**"Configuration error: Missing Supabase credentials"**
- .env file not loaded properly
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

**"Network error: Failed to fetch"**
- User is offline
- CORS issue (check Edge Function headers)
- Connection timeout

---

## What's Handled Automatically

You don't need to worry about:

✅ **Session Management** - Automatically retrieves fresh session
✅ **JWT Token** - Automatically includes `Authorization: Bearer ...`
✅ **API Key** - Automatically includes `apikey` header
✅ **Cache Control** - Automatically includes cache headers
✅ **CORS** - All headers properly configured
✅ **Error Parsing** - Returns structured error objects

---

## Adding a New Edge Function

### 1. Create Edge Function (Backend)

```typescript
// supabase/functions/my-function/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Your function logic here
    return new Response(
      JSON.stringify({ success: true, data: { message: 'Hello!' } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2. Add to API Utility (Frontend)

```typescript
// src/lib/edgeFunctions.ts

export const edgeFunctions = {
  // ... existing functions

  // Add your new function
  myFunction: (param?: string) =>
    callEdgeFunction('my-function', {
      method: 'POST',
      body: { param },
    }),
};
```

### 3. Use in Components

```typescript
import { edgeFunctions } from '../lib/edgeFunctions';

const handleClick = async () => {
  const result = await edgeFunctions.myFunction('test');

  if (result.success) {
    console.log('Success:', result.data);
  } else {
    console.error('Error:', result.error);
  }
};
```

---

## Best Practices

### ✅ DO

```typescript
// Use the centralized utility
const result = await edgeFunctions.fetchLatestBPReading();

// Check success before accessing data
if (result.success) {
  const data = result.data;
}

// Provide user-friendly error messages
setError(result.error);
```

### ❌ DON'T

```typescript
// Don't make direct fetch() calls to Edge Functions
const response = await fetch(`${url}/functions/v1/...`); // ❌

// Don't access data without checking success
const data = result.data; // ❌ Could be undefined

// Don't ignore errors
await edgeFunctions.myFunction(); // ❌ No error handling
```

---

## Debugging Tips

### Enable Detailed Logging

The utility already logs all requests. Check console for:

```
[EdgeFunction] Calling function-name with authenticated session
[EdgeFunction] Request URL: https://...
[EdgeFunction] Method: POST
[EdgeFunction] Headers: {hasAuth: true, hasApikey: true, ...}
[EdgeFunction] Response status: 200
[EdgeFunction] Success response: {...}
```

### Check Network Tab

In browser DevTools → Network tab:

1. Find the Edge Function request
2. Check **Request Headers**:
   - Should include `Authorization`, `apikey`, `cache-control`, `pragma`
3. Check **Response Headers**:
   - Should include `access-control-allow-origin: *`
4. Check **Response Body**:
   - Should be valid JSON with `success` field

### Common Issues

**401 Unauthorized**
- Session expired → User needs to log in again
- Check console for: `[EdgeFunction] No active session`

**CORS Error**
- Edge Function missing proper CORS headers
- Check Edge Function `corsHeaders` configuration

**TypeScript Error**
- Import path wrong: Use `'../lib/edgeFunctions'` not `'./lib/edgeFunctions'`
- Check that file exists at `src/lib/edgeFunctions.ts`

---

## Examples

### Complete Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { edgeFunctions } from '../lib/edgeFunctions';

const MyComponent: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await edgeFunctions.fetchLatestBPReading();

      if (!result.success) {
        setError(result.error || 'Failed to fetch data');
        return;
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h2>Blood Pressure</h2>
      <p>Systolic: {data.systolic}</p>
      <p>Diastolic: {data.diastolic}</p>
      <button onClick={fetchData}>Refresh</button>
    </div>
  );
};

export default MyComponent;
```

### Retry on Failure Example

```typescript
const fetchWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await edgeFunctions.fetchLatestBPReading();

    if (result.success) {
      return result.data;
    }

    if (i < maxRetries - 1) {
      console.log(`Retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Failed after retries');
};
```

### Token Refresh Example

```typescript
const syncData = async () => {
  // Try to sync
  let result = await edgeFunctions.withingsFetchMeasurements();

  // If token expired, refresh and retry
  if (!result.success && result.details?.needsRefresh) {
    console.log('Token expired, refreshing...');

    const refreshResult = await edgeFunctions.withingsRefreshToken();

    if (refreshResult.success) {
      // Retry with fresh token
      result = await edgeFunctions.withingsFetchMeasurements();
    }
  }

  return result;
};
```

---

## Summary

The centralized Edge Functions API provides:

- ✅ **Automatic authentication** - JWT always included
- ✅ **Standardized headers** - CORS, cache-control handled
- ✅ **Consistent errors** - User-friendly messages
- ✅ **Type safety** - Full TypeScript support
- ✅ **Easy to use** - Simple async/await pattern

Just import, call, and check `result.success`. Everything else is handled for you.

---

For more details, see [CENTRALIZED_API_LAYER_IMPLEMENTED.md](./CENTRALIZED_API_LAYER_IMPLEMENTED.md)
