import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

async function hashAnonymousId(anonId: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Recommendation event rate limiting is not configured.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`recommendation-events:${anonId}`),
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function consumeRecEventRateLimit(anonId: string) {
  const { data, error } = await getSupabaseAdmin().rpc(
    "consume_api_rate_limit",
    {
      p_key_hash: await hashAnonymousId(anonId),
      p_limit: 60,
      p_window_seconds: 600,
    },
  );
  if (error) throw error;
  return data === true;
}
