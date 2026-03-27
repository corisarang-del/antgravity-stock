const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const RATE_STORE = new Map<string, number[]>();

export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);

  return {
    allowed: origin ? allowedOrigins.has(origin) : true,
    headers: {
      ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      Vary: "Origin",
    },
  };
}

export function ensureAllowedOrigin(req: Request) {
  const { allowed, headers } = buildCorsHeaders(req);
  const origin = req.headers.get("Origin");
  if (origin && !allowed) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  return null;
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

export function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const hits = (RATE_STORE.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= limit) {
    throw new Error("RATE_LIMITED");
  }

  hits.push(now);
  RATE_STORE.set(key, hits);
}

export function getErrorMessage(error: unknown, fallback = "Internal server error") {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
