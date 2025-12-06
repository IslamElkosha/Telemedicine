# Withings BPM Connect - Testing Guide

Quick reference for testing the finalized integration.

---

## Prerequisites

1. User account created in the system
2. Logged in as a patient
3. Withings BPM Connect device available (or use Withings demo credentials)

---

## Test 1: Device Linking

**Steps:**
1. Navigate to `/patient/devices`
2. Look for Withings section
3. Click "Connect Withings Account" or "Link Device" button
4. Should redirect to `https://account.withings.com/oauth2_user/authorize2`
5. Enter Withings credentials and authorize
6. Should redirect back to `/patient/devices?withings=connected`
7. Status should show "Connected"

**Expected Console Logs:**
```
[EdgeFunction] Calling force-withings-relink with authenticated session
[EdgeFunction] Request URL: https://<supabase-url>/functions/v1/force-withings-relink?_t=...
[EdgeFunction] Method: POST
[EdgeFunction] Headers: {hasAuth: true, hasApikey: true, hasCacheControl: true, hasPragma: true}
[EdgeFunction] Response status: 200
[EdgeFunction] Success response: {success: true, authUrl: "https://account.withings.com/..."}
[WithingsConnector] Success! Redirecting to: https://account.withings.com/...
```

**If Error Occurs:**

**401 Unauthorized:**
- Check: Is user logged in?
- Check: Browser console shows JWT in request headers?
- Check: Backend logs show "Authorization header present: true"?

**CORS Error:**
- Check: Edge Function has proper CORS headers including `cache-control` and `pragma`
- Check: OPTIONS preflight returns 200 with CORS headers

**"Missing authorization header":**
- Frontend not including JWT
- Check centralized API utility is being used
- Check session exists: `supabase.auth.getSession()`

---

## Test 2: Data Fetching (First Time)

**Steps:**
1. After linking device, navigate to `/patient/dashboard`
2. Blood Pressure widget should load automatically
3. If user has taken measurements, should show: "120/80 mmHg" (example)
4. If no measurements yet, should show: "Awaiting data..."

**Expected Console Logs:**
```
[EdgeFunction] Calling fetch-latest-bp-reading with authenticated session
[EdgeFunction] Response status: 200
=== FETCH LATEST BP READING START ===
Authenticated user: <user_id>
Withings token found. Token expiry timestamp: 1733524800
Access token is valid
Fetching BP measurements from Withings API...
Withings API response status: 0
Number of measurement groups received: 5
Filtered BP measurement groups: 5
=== SORTING measurement groups by date (DESCENDING - newest first) ===
=== SELECTING FIRST ITEM (NEWEST) ===
Latest measurement group:
  - Date: 1733520000 (2024-12-06T18:00:00.000Z)
  - Systolic BP: 120 mmHg
  - Diastolic BP: 80 mmHg
  - Heart Rate: 72 bpm
=== FETCH LATEST BP READING END - SUCCESS ===
```

**If Error Occurs:**

**"No Withings connection found":**
- User hasn't linked device yet
- Complete Test 1 first

**"Token invalid. Please reconnect":**
- Token was deleted or expired beyond refresh
- Re-link device (Test 1)

**"No measurements found":**
- User hasn't taken any measurements on device yet
- Take a measurement on physical BPM Connect device
- Wait for device to sync (can take 1-2 minutes)

---

## Test 3: Manual Refresh

**Steps:**
1. On dashboard with BP widget visible
2. Click "Refresh" button
3. Data should reload
4. Should show latest measurement

**Expected Behavior:**
- Refresh icon spins during load
- New data appears (if measurement was taken recently)
- No errors in console

---

## Test 4: Token Expiry & Auto-Refresh

**Steps:**
1. *(Optional: Manually set token_expiry_timestamp to past time in DB)*
2. Navigate to dashboard
3. Widget should still load successfully
4. Check console for "Refreshing..." logs

**Expected Console Logs:**
```
Withings token found. Token expiry timestamp: 1733510400
Access token expired or expiring soon. Refreshing...
=== REFRESHING ACCESS TOKEN ===
Sending refresh request to: https://wbsapi.withings.net/v2/oauth2
Token refresh response status: 0
Token refreshed successfully. Updating database...
Tokens updated in database successfully
Using refreshed access token
Fetching BP measurements from Withings API...
```

**Critical Check:**
- Database field `token_expiry_timestamp` should be updated to new future timestamp
- No error about "invalid_token"
- Data loads successfully after refresh

---

## Test 5: Real-Time Updates

**Setup:**
1. Have dashboard open with BP widget
2. Take a new measurement on physical BPM Connect
3. Wait for device to sync (1-2 minutes)

**Expected Behavior:**
- Real-time subscription receives update
- Widget automatically refreshes (rate-limited to 5 seconds)
- New measurement appears without manual refresh

**Expected Console Logs:**
```
Real-time vitals update received: {eventType: "UPDATE", new: {...}}
[WithingsDeviceReadings] Real-time update triggered fetch
[EdgeFunction] Calling fetch-latest-bp-reading...
```

---

## Test 6: Multi-User Isolation

**Steps:**
1. Link Withings for User A
2. Log out
3. Log in as User B
4. Navigate to dashboard
5. User B should NOT see User A's data

**Expected Behavior:**
- User B sees "Withings not connected" or empty state
- No data leakage between users
- Each user must link their own device

---

## Debugging Commands

### Check if user has Withings token:
```sql
SELECT user_id, withings_user_id, token_expiry_timestamp, created_at
FROM withings_tokens
WHERE user_id = '<user_id>';
```

### Check token expiry timestamp:
```sql
SELECT
  user_id,
  token_expiry_timestamp,
  to_timestamp(token_expiry_timestamp) as expires_at,
  CASE
    WHEN token_expiry_timestamp > EXTRACT(EPOCH FROM NOW())
    THEN 'Valid'
    ELSE 'Expired'
  END as status
FROM withings_tokens
WHERE user_id = '<user_id>';
```

### Check latest measurement:
```sql
SELECT
  systolic,
  diastolic,
  heart_rate,
  measured_at,
  created_at
FROM withings_measurements
WHERE user_id = '<user_id>'
ORDER BY measured_at DESC
LIMIT 1;
```

### Check live vitals:
```sql
SELECT
  systolic,
  diastolic,
  heart_rate,
  updated_at
FROM user_vitals_live
WHERE user_id = '<user_id>';
```

---

## Common Issues & Solutions

### Issue: "401 Unauthorized" on device linking

**Cause:** JWT not being sent or invalid

**Solution:**
1. Check user is logged in: `await supabase.auth.getSession()`
2. Check centralized API utility is being used
3. Verify Authorization header in Network tab
4. Check Edge Function validates JWT correctly

---

### Issue: Old measurements showing instead of new ones

**Cause:** Server-side sorting not working or database cache

**Solution:**
1. Check backend logs show "SORTING" and "SELECTING FIRST ITEM (NEWEST)"
2. Verify sort order is `b.date - a.date` (descending)
3. Check Withings API returned multiple measurements
4. Clear browser cache and reload

---

### Issue: Token constantly expiring

**Cause:** Database field mismatch (THIS WAS FIXED)

**Solution:**
1. Verify code uses `token_expiry_timestamp` not `expires_at`
2. Check database column is `token_expiry_timestamp` (bigint)
3. Verify timestamp is Unix seconds not milliseconds
4. Check token refresh updates correct field

**Before (BROKEN):**
```typescript
const expiresAt = new Date(tokenData.expires_at);  // ❌ Field doesn't exist
```

**After (FIXED):**
```typescript
const expiryTimestamp = tokenData.token_expiry_timestamp;  // ✅ Correct field
```

---

### Issue: Infinite polling / Too many requests

**Cause:** setInterval or missing rate limiting

**Solution:**
1. Search codebase for `setInterval` calling Edge Functions
2. Verify `useEffect` has empty dependency array `[]`
3. Check real-time subscriptions have rate limiting
4. Should see: "Rate limit: Skipping fetch" in console

**Correct Pattern:**
```typescript
useEffect(() => {
  loadReadings();  // Once on mount

  // Real-time subscription (NOT polling)
  const channel = supabase
    .channel('updates')
    .on('postgres_changes', ..., (payload) => {
      // Rate limited
      if (timeSinceLastFetch < 5000) return;
      loadReadings();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);  // ✅ Empty array = runs once
```

---

### Issue: CORS error on Edge Function call

**Cause:** Edge Function missing proper CORS headers

**Solution:**
1. Check Edge Function has:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
   };
   ```
2. Check OPTIONS handler returns 200:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { status: 200, headers: corsHeaders });
   }
   ```
3. Check all responses include CORS headers:
   ```typescript
   return new Response(JSON.stringify(data), {
     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
   });
   ```

---

## Success Criteria

✅ User can link Withings device without errors
✅ Dashboard shows latest BP reading after linking
✅ Manual refresh updates data
✅ Token automatically refreshes when expired
✅ Real-time updates work (when device syncs)
✅ No infinite polling or excessive requests
✅ Multi-user data isolation maintained
✅ No 401 Unauthorized errors
✅ No CORS errors

---

## Next Steps After Testing

If all tests pass:
1. ✅ Integration is production ready
2. ✅ Deploy to staging environment
3. ✅ Test with real Withings devices
4. ✅ Monitor Edge Function logs for errors
5. ✅ Set up alerting for 401/500 errors
6. ✅ Document user-facing instructions

If any test fails:
1. Check error message in browser console
2. Check Edge Function logs in Supabase dashboard
3. Refer to "Common Issues & Solutions" section above
4. Verify database schema matches code expectations
5. Review WITHINGS_INTEGRATION_FINALIZED.md for details
