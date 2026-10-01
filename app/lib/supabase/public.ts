import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | undefined;

export function getPublicSupabaseClient() {
  if (!publicClient) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
      throw new Error("Missing public Supabase environment variables.");
    }

    publicClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return publicClient;
}