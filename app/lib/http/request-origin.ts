export function hasSameRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }
  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    return false;
  }

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const host = request.headers.get("host");
  if (host) {
    try {
      allowedOrigins.add(new URL(`${requestUrl.protocol}//${host}`).origin);
    } catch {
      return false;
    }
  }

  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.APP_ALLOWED_ORIGINS ?? "").split(","),
  ];
  for (const configuredOrigin of configuredOrigins) {
    if (!configuredOrigin?.trim()) continue;
    try {
      allowedOrigins.add(new URL(configuredOrigin.trim()).origin);
    } catch {
      continue;
    }
  }

  return allowedOrigins.has(parsedOrigin.origin);
}