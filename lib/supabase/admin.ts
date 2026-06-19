import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses RLS — NEVER import this into a client
// component or expose the key. Used only inside server actions that have
// already verified the caller's authorization (e.g. a medic minting a walk-in
// worker, which needs to create a shadow auth user via the admin API).
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the environment (Vercel + .env.local).
// Get it from Supabase dashboard → Project Settings → API → service_role key.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel env + .env.local " +
        "(Supabase dashboard → Settings → API → service_role).",
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
