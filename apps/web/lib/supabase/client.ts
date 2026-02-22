/**
 * Supabase CLIENT-SIDE client
 * Usato nei Client Components (use client)
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@eduplay/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
