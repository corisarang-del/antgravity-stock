const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

function getSupabaseBaseUrl() {
  return (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    null
  );
}

function getSupabasePublishableKey() {
  return (
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    null
  );
}

function verifyCronRequest(request: Request) {
  const expected = getRequiredEnv("CRON_SECRET");
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  return null;
}

async function invokeDueBilling(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const supabaseUrl = getSupabaseBaseUrl();
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL is missing" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const cronSecret = getRequiredEnv("BILLING_CRON_SECRET");
  const publishableKey = getSupabasePublishableKey();
  const requestUrl = new URL(request.url);
  const dryRun = requestUrl.searchParams.get("dryRun") === "true";
  const targetDate = requestUrl.searchParams.get("targetDate");
  const limit = requestUrl.searchParams.get("limit");

  const body: Record<string, unknown> = {
    dryRun,
  };
  if (targetDate) body.targetDate = targetDate;
  if (limit) body.limit = Number(limit);

  const headers: Record<string, string> = {
    ...JSON_HEADERS,
    Authorization: `Bearer ${cronSecret}`,
    "User-Agent": "vercel-cron/1.0",
  };
  if (publishableKey) {
    headers.apikey = publishableKey;
  }

  const response = await fetch(
    new URL("/functions/v1/toss-charge-due-subscriptions", supabaseUrl),
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );

  const data = await response.json().catch(() => ({ error: "Invalid JSON response" }));

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: JSON_HEADERS,
  });
}

export async function GET(request: Request) {
  return invokeDueBilling(request);
}

export async function POST(request: Request) {
  return invokeDueBilling(request);
}
