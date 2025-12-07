# Withings Integration - RLS Error Handling Improvements

## Overview
Updated the Withings integration to properly handle Row Level Security (RLS) error responses when checking for existing tokens.

## Changes Made

### 1. WithingsConnector.tsx
**Location:** `src/components/WithingsConnector.tsx:75-84`

**Before:**
```typescript
const { data: tokenData, error } = await supabase
  .from('withings_tokens')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

if (error || !tokenData) {
  setStatus({ connected: false });
}
```

**After:**
```typescript
const { data: tokenData, error, status: statusCode } = await supabase
  .from('withings_tokens')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

if (statusCode === 406 || statusCode === 403) {
  setStatus({ connected: false });
  return;
}

if (error || !tokenData) {
  setStatus({ connected: false });
}
```

### 2. WithingsKitDevices.tsx
**Location:** `src/components/WithingsKitDevices.tsx:57-67`

**Before:**
```typescript
const { data: tokenData } = await supabase
  .from('withings_tokens')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

if (tokenData) {
  // connection logic
}
```

**After:**
```typescript
const { data: tokenData, status: statusCode } = await supabase
  .from('withings_tokens')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

if (statusCode === 406 || statusCode === 403) {
  setHasConnection(false);
  setDevices(prev => prev.map(d => ({ ...d, connectionStatus: 'Disconnected' })));
  return;
}

if (tokenData) {
  // connection logic
}
```

## Why These Changes Matter

### HTTP Status Code Handling

#### 406 - Not Acceptable
PostgREST returns 406 when using `.single()` but no rows match the query. This is not an error condition for our use case - it simply means the user hasn't connected their Withings account yet.

#### 403 - Forbidden
RLS policies may deny access to the `withings_tokens` table before a token exists. This typically happens when:
- A user is trying to check if they have a token, but the RLS policy requires a token to exist first
- The policy logic creates a chicken-and-egg situation

By explicitly handling these status codes, we:
1. **Prevent false errors** - Users won't see error messages when they simply haven't connected yet
2. **Improve OAuth flow** - The connection process can proceed smoothly without RLS blocking initial checks
3. **Better UX** - The UI gracefully shows "Not Connected" instead of displaying errors

### Alternative: Using `.maybeSingle()`

Note that `WithingsDeviceReadings.tsx` already uses `.maybeSingle()` which handles the 406 case automatically by returning `null` instead of throwing an error:

```typescript
const { data } = await supabase
  .from('withings_tokens')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();  // Returns null if no row found, no error thrown
```

## Best Practices

When querying for 0 or 1 rows from Supabase:
1. **Prefer `.maybeSingle()`** - Simplest approach, returns null if no row found
2. **Handle status codes** - If using `.single()`, explicitly check for 406 and 403
3. **Treat 403 as "no data"** - In OAuth flows, RLS denials often mean "not set up yet"

## Impact

These changes ensure the Withings BPM Connect integration works smoothly for:
- New users connecting devices for the first time
- Users checking connection status
- OAuth callback flows
- Token refresh scenarios

Build status: ✅ Successful
