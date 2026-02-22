/**
 * Supabase ADMIN client (Service Role)
 * ⚠️ MAI esporre al browser. Solo per API Routes server-side.
 * Bypassa le RLS policies — usare con cautela!
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@eduplay/types";

// Singleton pattern per evitare connessioni multiple
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}
