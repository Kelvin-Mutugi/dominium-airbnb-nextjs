import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

function requestAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown"
  );
}

async function hashKey(scope: string, address: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Rate limiting is not configured.");
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
    new TextEncoder().encode(`${scope}:${address}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeSaleRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const keyHash = await hashKey(scope, requestAddress(request));
  const { data, error } = await getSupabaseAdmin().rpc("consume_api_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Sale marketplace rate-limit check failed:", error);
    throw new Error("Unable to process this request right now.");
  }
  return data === true;
}
