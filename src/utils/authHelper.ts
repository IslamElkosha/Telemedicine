import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Detects and handles "poisoned tokens" - corrupted auth state that causes infinite loops.
 * If a critical auth error is detected (oauth_client_id missing, status 500), performs a hard reset.
 *
 * This utility is used across the application to safely get sessions without risking infinite error loops.
 */
export async function getValidSession(useRefresh: boolean = false): Promise<Session> {
  try {
    let session: Session | null = null;
    let error: any = null;

    if (useRefresh) {
      const result = await supabase.auth.refreshSession();
      session = result.data.session;
      error = result.error;
    } else {
      const result = await supabase.auth.getSession();
      session = result.data.session;
      error = result.error;
    }

    if (error) {
      throw error;
    }

    if (!session) {
      throw new Error("No active session");
    }

    return session;
  } catch (err: any) {
    const errorMessage = err?.message || '';
    const errorStatus = err?.status || err?.context?.status;

    if (
      errorMessage.includes('oauth_client_id') ||
      errorMessage.includes('missing destination') ||
      errorStatus === 500
    ) {
      console.error("🔴 CRITICAL AUTH ERROR: Poisoned token detected. Forcing hard reset.");
      console.error("Error details:", err);

      performHardReset();

      throw new Error("Session corrupted. Redirecting to login...");
    }

    throw err;
  }
}

/**
 * Performs a hard reset of the authentication state:
 * 1. Clears localStorage
 * 2. Signs out from Supabase
 * 3. Redirects to login page
 */
export function performHardReset(): void {
  try {
    console.log("🔄 Step 1: Clearing localStorage...");
    localStorage.clear();

    console.log("🔄 Step 2: Attempting sign out...");
    supabase.auth.signOut().catch(() => {
      console.warn("Sign out failed, but continuing with reset...");
    });

    console.log("🔄 Step 3: Redirecting to login...");
    window.location.href = '/';
  } catch (resetError) {
    console.error("Hard reset failed:", resetError);
    window.location.reload();
  }
}
